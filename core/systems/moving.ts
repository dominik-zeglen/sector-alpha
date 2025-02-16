import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import { EntityIndex } from "./utils/entityIndex";
import { System } from "./system";

type Movable = RequireComponent<"movable" | "position">;

function move(entity: Movable, delta: number) {
  if (entity.cp.movable.velocity === 0 && entity.cp.movable.rotary === 0)
    return;
  const entityPosition = entity.cp.position;

  const dAngle = entity.cp.movable.rotary;
  const dPos = entity.cp.movable.velocity * delta;
  const moveVec = [
    Math.cos(entityPosition.angle) * dPos,
    Math.sin(entityPosition.angle) * dPos,
  ];

  entityPosition.coord[0] += moveVec[0];
  entityPosition.coord[1] += moveVec[1];
  entityPosition.angle = (entityPosition.angle + dAngle) % (2 * Math.PI);
  entityPosition.moved = true;

  entity.cp.docks?.docked.forEach((docked) => {
    const dockedPosition = entity.sim.entities
      .get(docked)!
      .requireComponents(["position"]).cp.position;

    dockedPosition.coord[0] += moveVec[0];
    dockedPosition.coord[1] += moveVec[1];
    dockedPosition.angle += (entityPosition.angle + dAngle) % (2 * Math.PI);
    dockedPosition.moved = true;
  });
}

export class MovingSystem extends System {
  entities: Movable[];
  index = new EntityIndex(["movable", "position"]);

  apply = (sim: Sim): void => {
    super.apply(sim);
    this.index.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (delta: number): void => {
    if (delta > 0) {
      for (const entity of this.index.getIt()) {
        move(entity, delta);
      }
    }
  };
}

export const movingSystem = new MovingSystem();
