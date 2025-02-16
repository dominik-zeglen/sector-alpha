import mapValues from "lodash/mapValues";
import type { PositionHex } from "@core/components/hecsPosition";
import { perCommodity } from "@core/utils/perCommodity";
import { Entity } from "../entity";
import { MissingComponentError } from "../errors";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import { mineableCommodities } from "../economy/commodity";

export const sectorComponents = [
  "hecsPosition",
  "name",
  "sectorStats",
] as const;

export type SectorComponent = (typeof sectorComponents)[number];
export type Sector = RequireComponent<SectorComponent>;

export const sectorSize = 500;
export function sector(entity: Entity): Sector {
  if (!entity.hasComponents(sectorComponents)) {
    throw new MissingComponentError(entity, sectorComponents);
  }

  return entity as Sector;
}

export interface InitialSectorInput {
  position: PositionHex;
  name: string;
  slug: string;
}

export function createSector(
  sim: Sim,
  { position, name, slug }: InitialSectorInput
) {
  const entity = new Entity(sim);
  entity
    .addComponent({
      name: "hecsPosition",
      value: position,
    })
    .addComponent({
      name: "name",
      value: name,
      slug,
    })
    .addComponent({
      name: "sectorStats",
      availableResources: mapValues(mineableCommodities, () => [] as number[]),
      prices: perCommodity(() => ({ buy: [], sell: [] })),
    })
    .addTag("sector")
    .addTag("selection");

  return entity as Sector;
}
