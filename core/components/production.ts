import { cloneDeep, merge } from "lodash";
import { commoditiesArray, Commodity } from "../economy/commodity";
import { perCommodity } from "../utils/perCommodity";
import { BaseComponent } from "./component";

export interface CommodityPAC {
  /**
   * Hourly production
   */
  produces: number;
  /**
   * Hourly consumption
   */
  consumes: number;
}

/**
 * Hourly production and consumption of commodities
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
  pac: PAC;

  /**
   * Duration of production cycle in seconds
   */
  time: number;
}

export function createProduction(
  time: number,
  pac: Partial<PAC> = {}
): Production {
  return {
    name: "production",
    pac: merge(cloneDeep(baseProductionAndConsumption), pac),
    time,
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
