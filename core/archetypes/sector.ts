import mapValues from "lodash/mapValues";
import type { PositionHex } from "@core/components/hecsPosition";
import { perCommodity } from "@core/utils/perCommodity";
import { Entity } from "../entity";
import { createRenderGraphics } from "../components/renderGraphics";
import { MissingComponentError } from "../errors";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import "@pixi/graphics-extras";
import { mineableCommodities } from "../economy/commodity";

export const sectorComponents = [
  "hecsPosition",
  "name",
  "renderGraphics",
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
}

export function createSector(sim: Sim, { position, name }: InitialSectorInput) {
  const entity = new Entity(sim);
  entity
    .addComponent({
      name: "hecsPosition",
      value: position,
    })
    .addComponent({
      name: "name",
      value: name,
    })
    .addComponent({
      name: "sectorStats",
      availableResources: mapValues(mineableCommodities, () => [] as number[]),
      prices: perCommodity(() => ({ buy: [], sell: [] })),
    })
    .addComponent(createRenderGraphics("sector"))
    .addTag("sector")
    .addTag("selection");

  return entity as Sector;
}
