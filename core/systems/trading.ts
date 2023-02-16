import { average, filter, flatMap, map, pipe, sum as fxSum } from "@fxts/core";
import { randomInt, sum } from "mathjs";
import { Sector } from "../archetypes/sector";
import { TradeEntry } from "../components/journal";
import { PriceBelief, TradeOffer } from "../components/trade";
import {
  commoditiesArray,
  Commodity,
  mineableCommoditiesArray,
} from "../economy/commodity";
import {
  getPlannedBudget,
  getSectorsInTeleportRange,
  WithTrade,
} from "../economy/utils";
import settings from "../settings";
import { Sim } from "../sim";
import { RequireComponent } from "../tsHelpers";
import { Cooldowns } from "../utils/cooldowns";
import { limit } from "../utils/limit";
import { perCommodity } from "../utils/perCommodity";
import { System } from "./system";

/**
 *
 * Commodity cost of production
 */
function getProductionCost(
  entity: RequireComponent<"modules" | "trade">,
  commodity: Commodity
): number {
  const productionModule = entity.cp.modules.ids
    .map(entity.sim.getOrThrow)
    .find((m) => m.cp.production?.pac[commodity].produces)
    ?.requireComponents(["production"]);

  if (!productionModule) {
    return entity.cp.trade.offers[commodity].price;
  }

  return Math.ceil(
    pipe(
      commoditiesArray,
      map((c) =>
        productionModule.cp.production.pac[c].consumes
          ? (getProductionCost(entity, c) *
              productionModule.cp.production.pac[c].consumes) /
            productionModule.cp.production.pac[commodity].produces
          : 0
      ),
      fxSum
    )
  );
}

/**
 *
 * Gets average price on the market in n jumps proximity
 */
export function getAveragePrice(
  sectorId: number,
  commodity: Commodity,
  sim: Sim,
  jumps: number
): number {
  return average(
    pipe(
      getSectorsInTeleportRange(sim.getOrThrow<Sector>(sectorId), jumps, sim),
      flatMap((sector) =>
        pipe(
          sim.queries.trading.get(),
          filter(
            (e) =>
              e.cp.position?.sector === sector.id &&
              e.cp.trade?.offers[commodity].active
          ),
          map((e) => e.cp.trade!.offers[commodity].price)
        )
      )
    )
  );
}

function adjustSellPrice(entity: WithTrade, commodity: Commodity): number {
  const currentPrice = entity.cp.trade.offers[commodity].price;
  if (!entity.cp.trade.offers[commodity].active) return currentPrice;

  const weight =
    entity.cp.storage.stored[commodity] /
    (entity.cp.storage.quota[commodity] -
      (entity.cp.compoundProduction
        ? entity.cp.compoundProduction.pac[commodity].consumes * 2
        : 0));
  const hadAnySale = entity.cp.journal.entries.some(
    (entry) =>
      entry.type === "trade" &&
      entry.commodity === commodity &&
      entry.time > entity.cp.trade.lastPriceAdjust.time &&
      entry.action !== entity.cp.trade.offers[commodity].type
  );

  const mean =
    (entity.cp.trade.pricing[commodity][0] +
      entity.cp.trade.pricing[commodity][1]) /
    2;

  const minPrice = entity.hasComponents(["compoundProduction"])
    ? getProductionCost(
        entity.requireComponents(["compoundProduction", "trade", "modules"]),
        commodity
      )
    : settings.global.minPrice;

  if (!hadAnySale) {
    const diff = weight * mean;
    entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[commodity].map(
      (v) => v - diff / 6
    ) as PriceBelief;
  } else {
    const averagePrice = getAveragePrice(
      entity.cp.position.sector,
      commodity,
      entity.sim,
      3
    );

    if (currentPrice < averagePrice) {
      const overbid = averagePrice - currentPrice;

      entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[
        commodity
      ].map((v) => v + overbid * weight * 1.2) as PriceBelief;
    } else {
      entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[
        commodity
      ].map((v) => v - mean / 5) as PriceBelief;
    }
  }

  entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[commodity].map(
    (v) =>
      limit(
        v,
        minPrice,
        (mineableCommoditiesArray as string[]).includes(commodity)
          ? settings.global.maxMineablePrice
          : settings.global.maxPrice
      )
  ) as PriceBelief;
  if (
    entity.cp.trade.pricing[commodity][0] ===
    entity.cp.trade.pricing[commodity][1]
  ) {
    entity.cp.trade.pricing[commodity][1] = Math.max(
      entity.cp.trade.pricing[commodity][1] * 1.02,
      entity.cp.trade.pricing[commodity][1] + 2
    );
  }

  return randomInt(...entity.cp.trade.pricing[commodity]);
}

function adjustBuyPrice(entity: WithTrade, commodity: Commodity): number {
  const currentPrice = entity.cp.trade.offers[commodity].price;
  if (!entity.cp.trade.offers[commodity].active) return currentPrice;

  const filled =
    entity.cp.storage.stored[commodity] / entity.cp.storage.quota[commodity];
  const hadAnySale = entity.cp.journal.entries.some(
    (entry) =>
      entry.type === "trade" &&
      entry.commodity === commodity &&
      entry.time > entity.cp.trade.lastPriceAdjust.time &&
      entry.action !== entity.cp.trade.offers[commodity].type
  );
  const mean =
    (entity.cp.trade.pricing[commodity][0] +
      entity.cp.trade.pricing[commodity][1]) /
    2;

  if (hadAnySale) {
    if (entity.cp.trade.pricing[commodity][1] / mean > 1.1) {
      if (filled > 0.5) {
        const diff = mean / 10;
        entity.cp.trade.pricing[commodity][0] += diff;
        entity.cp.trade.pricing[commodity][1] -= diff;
      } else {
        entity.cp.trade.pricing[commodity][1] *= 1.1;
      }
    }
  } else if (filled < 0.25) {
    const diff = (currentPrice - mean) / 2;
    entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[commodity].map(
      (v) => v + Math.abs(diff)
    ) as PriceBelief;
  } else {
    const averagePrice = getAveragePrice(
      entity.cp.position.sector,
      commodity,
      entity.sim,
      3
    );

    if (currentPrice > averagePrice) {
      const overbid = currentPrice - averagePrice;
      entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[
        commodity
      ].map((v) => v - overbid * 1.1) as PriceBelief;
    } else {
      entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[
        commodity
      ].map((v) => v + mean / 5) as PriceBelief;
    }
  }

  entity.cp.trade.pricing[commodity] = entity.cp.trade.pricing[commodity].map(
    (v) =>
      limit(
        v,
        settings.global.minPrice,
        (mineableCommoditiesArray as string[]).includes(commodity)
          ? settings.global.maxMineablePrice
          : settings.global.maxPrice
      )
  ) as PriceBelief;
  if (
    entity.cp.trade.pricing[commodity][0] ===
    entity.cp.trade.pricing[commodity][1]
  ) {
    entity.cp.trade.pricing[commodity][1] = Math.max(
      entity.cp.trade.pricing[commodity][1] * 1.02,
      entity.cp.trade.pricing[commodity][1] + 2
    );
  }

  return randomInt(...entity.cp.trade.pricing[commodity]);
}

export function adjustPrices(entity: WithTrade) {
  if (entity.cp.deployable) return;

  const quantities = perCommodity(
    (commodity) =>
      sum(
        (
          entity.cp.journal.entries.filter(
            (entry) =>
              entry.type === "trade" &&
              entry.commodity === commodity &&
              entry.time > entity.cp.trade.lastPriceAdjust.time &&
              entry.action !== entity.cp.trade.offers[commodity].type
          ) as TradeEntry[]
        ).map((entry) => entry.quantity)
      ) as number
  );

  commoditiesArray.forEach((commodity) => {
    entity.cp.trade.offers[commodity].price =
      entity.cp.trade.offers[commodity].type === "sell"
        ? adjustSellPrice(entity, commodity)
        : adjustBuyPrice(entity, commodity);
  });

  entity.cp.trade.lastPriceAdjust = {
    commodities: quantities,
    time: entity.sim.getTime(),
  };
}

export function getProductionSurplus(
  entity: RequireComponent<"compoundProduction">,
  commodity: Commodity
) {
  return (
    entity.cp.compoundProduction.pac[commodity].produces -
    entity.cp.compoundProduction.pac[commodity].consumes
  );
}

export function getOfferedQuantity(entity: WithTrade, commodity: Commodity) {
  const requiredBudget = getPlannedBudget(entity);
  const availableBudget = entity.cp.budget.available;
  const stored = entity.cp.storage.availableWares;
  const quota = entity.cp.storage.quota[commodity];
  const multiplier =
    requiredBudget > availableBudget ? availableBudget / requiredBudget : 1;

  if (entity.hasComponents(["shipyard"])) {
    return stored[commodity] > quota
      ? 0
      : Math.floor(multiplier * (stored[commodity] - quota));
  }

  if (!entity.hasComponents(["compoundProduction"])) {
    return stored[commodity];
  }

  const entityWithProduction = entity.requireComponents([
    "compoundProduction",
    "budget",
    "docks",
    "position",
    "storage",
    "owner",
    "trade",
  ]);
  const production = entityWithProduction.cp.compoundProduction;

  if (
    production.pac[commodity].consumes === production.pac[commodity].produces &&
    production.pac[commodity].consumes === 0
  ) {
    return entity.cp.storage.availableWares[commodity];
  }

  if (getProductionSurplus(entityWithProduction, commodity) > 0) {
    return stored[commodity] - production.pac[commodity].consumes * 2;
  }

  return stored[commodity] > quota
    ? 0
    : Math.floor(multiplier * (stored[commodity] - quota));
}

export function createOffers(entity: WithTrade) {
  if (entity.cp.deployable) return;

  entity.cp.trade.offers = perCommodity((commodity): TradeOffer => {
    const offeredQuantity = getOfferedQuantity(entity, commodity);
    const producedNet = entity.hasComponents(["compoundProduction"])
      ? getProductionSurplus(
          entity.requireComponents(["compoundProduction"]),
          commodity
        )
      : 0;

    return {
      active: !(offeredQuantity === 0 && producedNet === 0),
      price: entity.cp.trade.offers?.[commodity].price ?? 100,
      quantity: Math.abs(offeredQuantity),
      type: producedNet > 0 ? "sell" : "buy",
    };
  });
}

/**
 * Using slightly modified version of algorithm published in
 * Emergent Economies for Role Playing Games by Doran and Parberry, 2012
 *
 * @link https://ianparberry.com/pubs/econ.pdf
 */
export class TradingSystem extends System {
  cooldowns: Cooldowns<"adjustPrices" | "createOffers">;

  constructor(sim: Sim) {
    super(sim);
    this.cooldowns = new Cooldowns("adjustPrices", "createOffers");
  }

  exec = (delta: number): void => {
    this.cooldowns.update(delta);

    if (this.cooldowns.canUse("adjustPrices")) {
      this.cooldowns.use("adjustPrices", 900);
      this.sim.queries.trading.get().forEach(adjustPrices);
    }

    if (this.cooldowns.canUse("createOffers")) {
      this.cooldowns.use("createOffers", 1);
      this.sim.queries.trading.get().forEach(createOffers);
    }
  };
}
