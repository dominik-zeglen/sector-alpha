import Color from "color";
import { Entity } from "../components/entity";
import { MissingComponentError } from "../errors";
import { Sim } from "../sim";
import { RequireComponent } from "../tsHelpers";
import { createBudget } from "../components/budget";

let factionCounter = 0;

export const factionComponents = ["color", "budget", "name"] as const;

export type FactionComponent = typeof factionComponents[number];
export type Faction = RequireComponent<FactionComponent>;

export function faction(entity: Entity): Faction {
  if (!entity.hasComponents(factionComponents)) {
    throw new MissingComponentError(entity, factionComponents);
  }

  return entity as Faction;
}

export function createFaction(name: string, sim: Sim) {
  const entity = new Entity(sim);
  entity
    .addComponent({
      name: "color",
      value: Color.rgb(151, 255, 125)
        .rotate((factionCounter * 360) / 8)
        .toString(),
    })
    .addComponent(createBudget())
    .addComponent({ name: "name", value: name });
  factionCounter++;

  return entity as Faction;
}
