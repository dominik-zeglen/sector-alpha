import { getFieldMax } from "@core/archetypes/asteroidField";
import { filter, pipe, toArray } from "@fxts/core";
import groupBy from "lodash/groupBy";
import { sum } from "mathjs";
import type { Sector } from "../archetypes/sector";
import type { Commodity } from "../economy/commodity";
import { getSectorsInTeleportRange } from "../economy/utils";
import type { RequireComponent } from "../tsHelpers";
import { perCommodity } from "./perCommodity";

export interface SectorResources {
  available: number;
  max: number;
}

/**
 * Get current mineable resources in sector
 */
export function getSectorResources(
  sector: Sector,
  neighbourhood: number
): Record<Commodity, SectorResources> {
  const neighbors = pipe(
    getSectorsInTeleportRange(sector, neighbourhood, sector.sim),
    filter((e) => e.cp.owner?.id !== sector.cp.owner?.id),
    toArray
  );
  const fields = pipe(
    sector.sim.index.asteroidFields.getIt(),
    filter((field) =>
      [sector.id, ...neighbors.map((e) => e.id)].includes(
        field.cp.position.sector
      )
    ),
    toArray
  );
  const fieldsByType = groupBy(fields, (field) => field.cp.asteroidSpawn.type);

  return perCommodity((commodity) => ({
    available:
      fieldsByType[commodity]
        ?.map((field) => field.cp.asteroidSpawn.amount)
        .reduce((acc, a) => acc + a, 0) ?? 0,
    max:
      fieldsByType[commodity]?.reduce(
        (max, field) => max + getFieldMax(field.cp.asteroidSpawn),
        0
      ) ?? 0,
  }));
}

/**
 * Get all commodities used by facilities
 */
export function getResourceUsage(
  facilities: Array<RequireComponent<"compoundProduction" | "modules">>
): Record<Commodity, number> {
  return perCommodity(
    (commodity) =>
      sum(
        facilities.flatMap((facility) =>
          facility.cp.compoundProduction.pac[commodity].consumes > 0
            ? facility.cp.modules.ids
                .map(facility.sim.get)
                .map((facilityModule) =>
                  facilityModule?.cp.production
                    ? facilityModule.cp.production.pac[commodity].consumes
                    : 0
                )
            : []
        )
      ) as number
  );
}

/**
 * Get all commodities produced by facilities
 */
export function getResourceProduction(
  facilities: Array<RequireComponent<"compoundProduction" | "modules">>
): Record<Commodity, number> {
  return perCommodity(
    (commodity) =>
      sum(
        facilities.flatMap((facility) =>
          facility.cp.compoundProduction.pac[commodity].produces > 0
            ? facility.cp.modules.ids
                .map(facility.sim.get)
                .map((facilityModule) =>
                  facilityModule?.cp.production
                    ? facilityModule.cp.production.pac[commodity].produces
                    : 0
                )
            : []
        )
      ) as number
  );
}
