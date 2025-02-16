import type { Vec2 } from "ogl";
import { Entity } from "../entity";
import { MissingComponentError } from "../errors";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";

export const waypointComponents = ["position"] as const;

export type WaypointComponent = (typeof waypointComponents)[number];
export type Waypoint = RequireComponent<WaypointComponent>;

export function waypoint(entity: Entity): Waypoint {
  if (!entity.hasComponents(waypointComponents)) {
    throw new MissingComponentError(entity, waypointComponents);
  }

  return entity as Waypoint;
}

export interface WaypointInput {
  /**
   * ID of the entity that owns this waypoint, eg. a ship that created it
   */
  owner: number;
  value: Vec2;
  sector: number;
}

export function createWaypoint(
  sim: Sim,
  { value, sector, owner }: WaypointInput
) {
  const entity = new Entity(sim);

  entity
    .addComponent({
      name: "position",
      coord: value,
      angle: 0,
      sector,
      moved: false,
    })
    .addComponent({ name: "disposable", owner })
    .addTag("virtual");

  return entity as Waypoint;
}
