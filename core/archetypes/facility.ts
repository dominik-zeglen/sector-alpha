import Color from "color";
import type { Matrix } from "mathjs";
import { createBudget } from "../components/budget";
import { Entity } from "../entity";
import { createRender } from "../components/render";
import { createCommodityStorage } from "../components/storage";
import { createTrade } from "../components/trade";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import type { Sector } from "./sector";
import { createDocks } from "../components/dockable";
import type { Faction } from "./faction";

export const commanderRange = 4;

export const facilityComponents = [
  "budget",
  "docks",
  "modules",
  "name",
  "position",
  "render",
  "journal",
  "storage",
  "trade",
  "facilityModuleQueue",
] as const;

export type FacilityComponent = (typeof facilityComponents)[number];
export type Facility = RequireComponent<FacilityComponent>;

export function facility(entity: Entity): Facility {
  return entity.requireComponents(facilityComponents);
}

export interface InitialFacilityInput {
  position: Matrix;
  owner: Faction;
  sector: Sector;
}

export function createFacilityName(
  entity: RequireComponent<"position">,
  label: string
) {
  const owner = entity.cp.owner?.id
    ? entity.sim.getOrThrow<Faction>(entity.cp.owner.id)
    : null;
  const sector = entity.sim.getOrThrow<Sector>(entity.cp.position.sector);

  return owner
    ? [owner.cp.name.slug, sector.cp.name.value, label].join(" ")
    : [sector.cp.name.value, label].join(" ");
}

export function createFacility(sim: Sim, initial: InitialFacilityInput) {
  const entity = new Entity(sim);

  entity
    .addComponent(createBudget())
    .addComponent(createDocks({ large: 1, medium: 3, small: 3 }))
    .addComponent({ name: "facilityModuleQueue", building: null, queue: [] })
    .addComponent({
      name: "modules",
      ids: [],
    })
    .addComponent({
      name: "position",
      angle: 0,
      coord: initial.position,
      sector: initial.sector.id,
      moved: false,
    })
    .addComponent(
      createRender({
        color: initial.owner?.cp.color.value
          ? Color(initial.owner?.cp.color.value).rgbNumber()
          : Color.hsl(0, 0, 70).rgbNumber(),
        defaultScale: 1,
        texture: "fFactory",
        layer: "facility",
      })
    )
    .addComponent(createCommodityStorage())
    .addComponent(createTrade())
    .addComponent({ name: "journal", entries: [] })
    .addComponent({
      name: "hitpoints",
      g: { hp: null!, shield: null! },
      hp: { max: 100000, regen: 0, value: 100000 },
    })
    .addComponent({
      name: "name",
      value: createFacilityName(
        entity.requireComponents(["position"]),
        "Facility"
      ),
    })
    .addTag("selection")
    .addTag("facility");

  if (initial.owner) {
    entity.addComponent({
      name: "owner",
      id: initial.owner.id,
    });
  }

  return facility(entity);
}
