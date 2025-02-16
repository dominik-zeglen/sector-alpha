import {
  average,
  filter,
  flatMap,
  map,
  pipe,
  sum as fxSum,
  max,
} from "@fxts/core";
import { randomInt, sum } from "mathjs";
import { isIncomingAllocation } from "@core/components/storage";
import type { Sector } from "../archetypes/sector";
import type { TradeEntry } from "../components/journal";
import type { PriceBelief } from "../components/trade";
import type { Commodity } from "../economy/commodity";
import { commoditiesArray } from "../economy/commodity";
import type { WithTrade } from "../economy/utils";
import { commodityPrices, getSectorsInTeleportRange } from "../economy/utils";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
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
          sim.index.sectorTrading.get(sector.id),
          filter((e) => e.cp.trade?.offers[commodity].active),
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
    : commodityPrices[commodity].min;

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
    (v) => limit(v, minPrice, commodityPrices[commodity].max)
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
      limit(v, commodityPrices[commodity].min, commodityPrices[commodity].max)
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
  if (!entity.cp.trade.auto.pricing) return;

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
  const stored = entity.cp.storage.availableWares;
  const incoming =
    pipe(
      entity.cp.storage.allocations,
      filter((a) => isIncomingAllocation(a.amount[commodity])),
      map((a) => a.amount[commodity]),
      fxSum
    ) || 0;
  const quota = entity.cp.storage.quota[commodity];

  if (entity.hasComponents(["shipyard"])) {
    return stored[commodity] + incoming > quota
      ? 0
      : Math.floor(stored[commodity] - incoming - quota);
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
    production.pac[commodity].produces === 0 &&
    production.pac[commodity].consumes === 0
  ) {
    return entity.cp.storage.availableWares[commodity];
  }

  if (getProductionSurplus(entityWithProduction, commodity) > 0) {
    return Math.max(
      stored[commodity] - production.pac[commodity].consumes * 2,
      0
    );
  }

  return stored[commodity] > quota
    ? 0
    : Math.floor(stored[commodity] - incoming - quota);
}

export function updateOfferQuantity(entity: WithTrade) {
  commoditiesArray.forEach((commodity) => {
    if (entity.cp.trade.offers[commodity].active) {
      entity.cp.trade.offers[commodity].quantity = Math.abs(
        getOfferedQuantity(entity, commodity)
      );
    }
  });
}

export function createOffers(entity: WithTrade) {
  if (!entity.cp.trade.auto.pricing && entity.cp.trade.auto.quantity) {
    updateOfferQuantity(entity);
  } else if (entity.cp.trade.auto.pricing && entity.cp.trade.auto.quantity) {
    for (const commodity of commoditiesArray) {
      const offeredQuantity = getOfferedQuantity(entity, commodity);
      const producedNet = entity.hasComponents(["compoundProduction"])
        ? getProductionSurplus(
            entity.requireComponents(["compoundProduction"]),
            commodity
          )
        : 0;

      const offer = entity.cp.trade.offers[commodity];

      offer.active = !(offeredQuantity === 0 && producedNet === 0);
      offer.price = offer.price ?? commodityPrices[commodity].avg;
      offer.quantity = Math.abs(offeredQuantity);
      offer.type = producedNet > 0 ? "sell" : "buy";
    }
  }
}

/**
 * Using slightly modified version of algorithm published in
 * Emergent Economies for Role Playing Games by Doran and Parberry, 2012
 *
 * @link https://ianparberry.com/pubs/econ.pdf
 */
export class TradingSystem extends System<"adjustPrices" | "createOffers"> {
  latestTradeId = 0;

  collect = (sim: Sim): void => {
    this.latestTradeId =
      pipe(
        sim.index.ships.getIt(),
        flatMap((ship) => ship.cp.orders.value),
        filter((order) => order.type === "trade"),
        flatMap((order) => order.actions),
        map((action) =>
          action.type === "trade"
            ? Number(action.offer.tradeId.split(":")[2])
            : 0
        ),
        max
      ) || 0;
  };

  createId = (initiatorId: number, targetId: number): string => {
    this.latestTradeId++;
    return [initiatorId, targetId, this.latestTradeId].join(":");
  };

  apply = (sim: Sim): void => {
    super.apply(sim);
    this.collect(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  destroy = (): void => {
    this.latestTradeId = 0;
  };

  exec = (): void => {
    if (this.cooldowns.canUse("adjustPrices")) {
      this.cooldowns.use("adjustPrices", 900);
      for (const entity of this.sim.index.trading.getIt()) {
        adjustPrices(entity);
      }
    }

    if (this.cooldowns.canUse("createOffers")) {
      this.cooldowns.use("createOffers", 1);
      for (const entity of this.sim.index.trading.getIt()) {
        createOffers(entity);
      }
    }
  };
}

export const tradingSystem = new TradingSystem();
