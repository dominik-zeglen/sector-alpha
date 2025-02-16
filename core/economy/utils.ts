import type { FacilityModuleInput } from "@core/archetypes/facilityModule";
import { discriminate } from "@core/utils/maps";
import sortBy from "lodash/sortBy";
import minBy from "lodash/minBy";
import maxBy from "lodash/maxBy";
import {
  filter,
  map,
  pipe,
  toArray,
  average,
  sum as fxtsSum,
  flatMap,
  sortBy as fxtsSortBy,
  reverse,
  take,
  identity,
  min,
  max,
} from "@fxts/core";
import type { Faction } from "@core/archetypes/faction";
import { relationThresholds } from "@core/components/relations";
import type { Sim } from "../sim";
import type { Commodity } from "./commodity";
import { commoditiesArray } from "./commodity";
import type { RequireComponent } from "../tsHelpers";
import type { AsteroidField } from "../archetypes/asteroidField";
import type { Asteroid } from "../archetypes/asteroid";
import { asteroid } from "../archetypes/asteroid";
import type { Sector } from "../archetypes/sector";
import { sector as asSector } from "../archetypes/sector";
import type { Waypoint } from "../archetypes/waypoint";
import { perCommodity } from "../utils/perCommodity";
import { pickRandom } from "../utils/generators";
import modules from "../world/data/facilityModules.json";

export const tradeComponents = [
  "trade",
  "storage",
  "budget",
  "position",
  "owner",
  "docks",
  "journal",
] as const;
export type WithTrade = RequireComponent<(typeof tradeComponents)[number]>;

export function getSectorsInTeleportRange(
  origin: Sector,
  jumps: number,
  sim: Sim
): IterableIterator<Sector> {
  const ids = Object.entries(sim.paths[origin.id.toString()] ?? {})
    .filter(([, path]) => path.distance <= jumps)
    .map(([id]) => parseInt(id, 10));
  return map((id) => sim.getOrThrow<Sector>(id), ids);
}

export interface TradeWithMostProfit {
  buyer: WithTrade;
  seller: WithTrade;
  commodity: Commodity;
}

/**
 * Find commodity, seller and buyer in proximity that yields most
 * profitable trade
 */
export function getTradeWithMostProfit(
  from: Waypoint | Sector,
  sectorDistance: number,
  facilityFilter: (_f: WithTrade) => boolean
): TradeWithMostProfit | null {
  const sectorsInTeleportRange = getSectorsInTeleportRange(
    asSector(
      from.cp.hecsPosition
        ? from
        : from.sim.getOrThrow(
            from.requireComponents(["position"]).cp.position.sector
          )!
    ),
    sectorDistance,
    from.sim
  );

  const facilitiesInRange = pipe(
    sectorsInTeleportRange,
    flatMap((sector) =>
      pipe(
        from.sim.index.sectorTrading.get(sector.id),
        filter(facilityFilter),
        toArray
      )
    ),
    toArray
  );

  const bestOffers = perCommodity((commodity) => ({
    // We buy, facility sells
    buy: minBy(
      pipe(
        facilitiesInRange,
        filter(
          (f) =>
            f.cp.trade.offers[commodity].active &&
            f.cp.trade.offers[commodity].type === "sell" &&
            f.cp.trade.offers[commodity].quantity > 0
        ),
        toArray
      ),
      (f) => f.cp.trade.offers[commodity].price
    ),
    sell: maxBy(
      pipe(
        facilitiesInRange,
        filter(
          (f) =>
            f.cp.trade.offers[commodity].active &&
            f.cp.trade.offers[commodity].type === "buy" &&
            f.cp.trade.offers[commodity].quantity > 0
        ),
        toArray
      ),
      (f) => f.cp.trade.offers[commodity].price
    ),
  }));

  const profits = pipe(
    commoditiesArray,
    map((commodity) => ({
      commodity,
      profit:
        bestOffers[commodity].sell && bestOffers[commodity].buy
          ? bestOffers[commodity].sell!.cp.trade.offers[commodity].price /
            bestOffers[commodity].buy!.cp.trade.offers[commodity].price
          : 0,
    })),
    filter(({ profit }) => profit > 1),
    toArray
  );

  if (profits.length === 0) {
    return null;
  }

  const commodityWithMostProfit = pickRandom(
    sortBy(profits, "profit").slice(-3)
  ).commodity;

  return {
    buyer:
      bestOffers[commodityWithMostProfit].sell!.requireComponents(
        tradeComponents
      ),
    seller:
      bestOffers[commodityWithMostProfit].buy!.requireComponents(
        tradeComponents
      ),
    commodity: commodityWithMostProfit,
  };
}

export function getBuyersForCommodityInRange(
  entity: RequireComponent<"position" | "owner">,
  commodity: Commodity,
  minQuantity: number,
  sectorDistance: number
) {
  const faction = entity.sim.getOrThrow<Faction>(entity.cp.owner.id);
  const profit = (f: WithTrade) =>
    f.cp.owner.id === faction.id
      ? Infinity
      : f.cp.trade.offers[commodity].price;

  return pipe(
    getSectorsInTeleportRange(
      asSector(entity.sim.getOrThrow(entity.cp.position.sector)!),
      sectorDistance,
      entity.sim
    ),
    flatMap((sector) => entity.sim.index.sectorTrading.get(sector.id)),
    filter(
      (f) =>
        (f.cp.owner.id === faction.id ||
          faction.cp.relations.values[f.cp.owner.id] >=
            relationThresholds.trade) &&
        f.cp.trade.offers[commodity].active &&
        f.cp.trade.offers[commodity].type === "buy" &&
        f.cp.trade.offers[commodity].quantity >= minQuantity
    ),
    faction.tags.has("player")
      ? filter((f) => f.tags.has("discovered"))
      : identity,
    map((f) => ({
      facility: f,
      profit: profit(f),
    })),
    fxtsSortBy((v) => v.profit),
    reverse,
    toArray
  );
}

export function sellCommodityWithMostProfit(
  entity: RequireComponent<"position" | "owner">,
  commodity: Commodity,
  minQuantity: number,
  sectorDistance: number
): WithTrade | null {
  const buyers = getBuyersForCommodityInRange(
    entity,
    commodity,
    minQuantity,
    sectorDistance
  );

  if (!buyers[0] || buyers[0].profit <= 0) {
    return null;
  }

  return pickRandom(
    buyers
      .filter(
        (f, _, arr) =>
          !Number.isFinite(f.profit) || f.profit / arr[0].profit >= 0.95
      )
      .map((f) => f.facility)
  )!;
}

export function getFacilityWithMostProfit(
  facility: WithTrade,
  commodity: Commodity,
  minQuantity: number,
  sectorDistance: number
): WithTrade | null {
  const faction = facility.sim.getOrThrow<Faction>(facility.cp.owner.id);

  const profit = (f: WithTrade) =>
    f.cp.owner.id === facility.cp.owner.id
      ? Infinity
      : (facility.cp.trade.offers[commodity].price -
          f.cp.trade.offers[commodity].price) *
        (facility.cp.trade.offers[commodity].type === "buy" ? 1 : -1);

  const sortedByProfit = pipe(
    getSectorsInTeleportRange(
      asSector(facility.sim.getOrThrow(facility.cp.position.sector)!),
      sectorDistance,
      facility.sim
    ),
    flatMap((sector) => facility.sim.index.sectorTrading.get(sector.id)),
    filter(
      (f) =>
        (f.cp.owner.id === faction.id ||
          faction.cp.relations.values[f.cp.owner.id] >=
            relationThresholds.trade) &&
        f.cp.trade.offers[commodity].active &&
        f.cp.trade.offers[commodity].type !==
          facility.cp.trade.offers[commodity].type &&
        f.cp.trade.offers[commodity].quantity >= minQuantity
    ),
    faction.tags.has("player")
      ? filter((f) => f.tags.has("discovered"))
      : identity,
    map((f) => ({
      facility: f,
      profit: profit(f),
    })),
    fxtsSortBy((v) => v.profit),
    reverse,
    take(3),
    toArray
  );

  if (!sortedByProfit[0] || sortedByProfit[0].profit <= 0) {
    return null;
  }

  return pickRandom(sortedByProfit).facility;
}

export function getMineableAsteroid(
  field: AsteroidField
): Asteroid | undefined {
  return pickRandom(
    field.cp.children.entities
      .map((e) => asteroid(field.sim.getOrThrow(e)!))
      .filter((a) => !a.cp.minable.minedById && a.cp.minable.resources > 0)
  );
}

/**
 *
 * Minimum required money to fulfill all buy requests, not taking
 * into account sell and inactive offers
 */
export function getPlannedBudget(entity: WithTrade): number {
  return commoditiesArray.reduce(
    (budget, commodity) =>
      budget +
      (entity.cp.trade.offers[commodity].type === "sell" ||
      !entity.cp.trade.offers[commodity].active
        ? 0
        : entity.cp.storage.quota[commodity] -
          entity.cp.storage.stored[commodity]) *
        entity.cp.trade.offers[commodity].price,
    0
  );
}

/**
 * Calculates price of commodity given its production capabilities
 */
export function getCommodityCost(
  commodity: Commodity,
  facilityModules: FacilityModuleInput[],
  fn: (_it: Iterable<number>) => number = average
): number {
  const productionModules = facilityModules.filter(
    discriminate("type", "production")
  );

  if (!productionModules.find((fm) => fm.pac[commodity]?.produces)) {
    const x3 = (v: number) => [v, v * 3];
    return fn(
      {
        ice: x3(9),
        ore: x3(14),
        silica: x3(17),
        fuelium: x3(25),
        goldOre: x3(32),
      }[commodity] ?? []
    );
  }

  return pipe(
    productionModules,
    filter((fm) => fm.pac[commodity]?.produces),
    map((fm) =>
      pipe(
        Object.entries(fm.pac),
        filter(([_, pac]) => pac?.consumes),
        map(
          ([consumedCommodity, { consumes }]) =>
            (getCommodityCost(
              consumedCommodity as Commodity,
              productionModules,
              fn
            ) *
              consumes *
              1.2) /
            fm.pac[commodity]!.produces
        ),
        fxtsSum
      )
    ),
    fn,
    Math.floor
  );
}

/**
 * Calculates min, avg and max price of commodities based on production
 */
export const commodityPrices = perCommodity((commodity) => ({
  min: getCommodityCost(commodity, modules as any, min),
  avg: getCommodityCost(commodity, modules as any),
  max: getCommodityCost(commodity, modules as any, max),
}));
