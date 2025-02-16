import cloneDeep from "lodash/cloneDeep";
import merge from "lodash/merge";
import type { Commodity } from "../economy/commodity";
import { commoditiesArray } from "../economy/commodity";
import { perCommodity } from "../utils/perCommodity";
import type { BaseComponent } from "./component";

export interface CommodityPAC {
  /**
   * Monthly production
   */
  produces: number;
  /**
   * Monthly consumption
   */
  consumes: number;
}

/**
 * Monthly production and consumption of commodities
 */
export type PAC = Record<Commodity, CommodityPAC>;

export const baseProductionAndConsumption = perCommodity(
  (): CommodityPAC => ({
    consumes: 0,
    produces: 0,
  })
);

export interface BaseProduction {
  pac: PAC;
}

export function getSummedConsumption(production: BaseProduction): number {
  return commoditiesArray.reduce(
    (acc, commodity) => acc + production.pac[commodity].consumes,
    0
  );
}

export function getSummedProduction(production: BaseProduction): number {
  return commoditiesArray.reduce(
    (acc, commodity) => acc + production.pac[commodity].produces,
    0
  );
}

export function getRequiredStorage(production: BaseProduction): number {
  return getSummedConsumption(production) + getSummedProduction(production);
}

export interface Production
  extends BaseComponent<"production">,
    BaseProduction {
  active: boolean;
  /**
   * Indicates if entity completed production in last cycle
   */
  produced: boolean;
  /**
   * Some commodities are produced or consumed only once per few cycles.
   * To mitigate this they are stored in production buffer
   */
  buffer: Record<"production" | "consumption", Record<Commodity, number>>;
}

export function createProduction(pac: Partial<PAC> = {}): Production {
  return {
    buffer: {
      production: perCommodity(() => 0),
      consumption: perCommodity(() => 0),
    },
    name: "production",
    active: true,
    pac: merge(cloneDeep(baseProductionAndConsumption), pac),
    produced: true,
  };
}

/**
 * Mark entity as able to produce, but delegate it to entity's modules having
 * `Production` component
 */
export interface CompoundProduction
  extends BaseComponent<"compoundProduction">,
    BaseProduction {}

export function createCompoundProduction(
  pac: Partial<PAC> = {}
): CompoundProduction {
  return {
    name: "compoundProduction",
    pac: merge(cloneDeep(baseProductionAndConsumption), pac),
  };
}
