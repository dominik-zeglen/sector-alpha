import { changeHp } from "@core/components/hitpoints";
import settings from "@core/settings";
import type { Sim } from "@core/sim";
import type { RequireComponent } from "@core/tsHelpers";
import { findInAncestors } from "@core/utils/findInAncestors";
import type { DockSize } from "@core/components/dockable";
import type { Entity } from "@core/entity";
import { stopCruise } from "@core/utils/moving";
import { Vec2 } from "ogl";
import { regenCooldown } from "./hitpointsRegenerating";
import { EntityIndex } from "./utils/entityIndex";
import { System } from "./system";
import { transport3D } from "./transport3d";

const sizeMultipliers: Record<DockSize, [number, number, number]> = {
  large: [0.1, -5, 10],
  medium: [0.5, -1, 25],
  small: [0.05, -10, 45],
};
export function getEvasionChance(speed: number, size: DockSize): number {
  const [a, b, c] = sizeMultipliers[size];
  return Math.max(0, ((b / speed) * 10 * a + c) / 100);
}

function getAngleDiff(
  origin: RequireComponent<"position">,
  target: RequireComponent<"position">
): number {
  const targetVector = new Vec2()
    .copy(target.cp.position.coord)
    .sub(origin.cp.position.coord);

  const angle =
    Math.atan2(targetVector[1], targetVector[0]) - origin.cp.position.angle;

  return angle > Math.PI
    ? angle - 2 * Math.PI
    : angle < -Math.PI
    ? angle + 2 * Math.PI
    : angle;
}

export function isInDistance(
  entity: RequireComponent<"damage">,
  target: RequireComponent<"position">,
  r: number = entity.cp.damage.range
): boolean {
  return (
    findInAncestors(entity, "position").cp.position.coord.distance(
      target.cp.position.coord
    ) <= r
  );
}

export function isInRange(
  entity: RequireComponent<"damage">,
  target: RequireComponent<"position">
) {
  const inDistance = isInDistance(entity, target);
  if (!inDistance) return false;

  const parentWithPosition = findInAncestors(entity, "position");
  const angleDiff = getAngleDiff(parentWithPosition, target);

  return Math.abs(angleDiff) <= entity.cp.damage.angle / 2;
}

function shouldAttackBack(
  attacker: RequireComponent<"damage">,
  target: RequireComponent<"position">
): boolean {
  const attackerOrParent = findInAncestors(attacker, "position");

  return (
    !!target.cp.damage &&
    target.tags.has("role:military") &&
    (target.cp.orders?.value[0]?.type !== "attack" ||
      (target.cp.orders.value[0].targetId !== attackerOrParent.id &&
        !attacker.sim
          .getOrThrow(target.cp.orders.value[0].targetId)
          .tags.has("role:military") &&
        isInDistance(target.requireComponents(["damage"]), attackerOrParent)))
  );
}

function attack(attacker: RequireComponent<"orders">, target: Entity) {
  if (attacker.cp.orders.value[0]) {
    attacker.cp.orders.value[0].interrupt = true;
  }
  attacker.cp.orders.value.splice(1, 0, {
    type: "attack",
    actions: [],
    followOutsideSector: false,
    ordersForSector: 0,
    origin: "auto",
    targetId: findInAncestors(target, "position").id,
  });
}

const cdKey = "attack";

export class AttackingSystem extends System {
  index = new EntityIndex(["damage"]);

  apply = (sim: Sim) => {
    super.apply(sim);
    this.index.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (): void => {
    if (this.sim.getTime() < settings.bootTime) return;

    for (const entity of this.index.getIt()) {
      if (!(entity.cp.damage.targetId && entity.cooldowns.canUse(cdKey)))
        continue;

      if (!this.sim.entities.has(entity.cp.damage.targetId)) {
        entity.cp.damage.targetId = null;
        continue;
      }

      if (entity.cp.drive?.state === "cruise") {
        continue;
      }

      const target = this.sim
        .getOrThrow(entity.cp.damage.targetId)
        .requireComponents(["position", "hitpoints"]);
      const entityOrParent = findInAncestors(entity, "position");

      if (!isInRange(entity, target)) continue;

      entity.cooldowns.use(cdKey, entity.cp.damage.cooldown);
      if (
        !target.cp.movable ||
        !target.cp.dockable ||
        Math.random() >
          getEvasionChance(target.cp.movable.velocity, target.cp.dockable.size)
      ) {
        transport3D.hooks.shoot.notify(
          entity.requireComponents(["position", "damage"])
        );
        changeHp(target, entity.cp.damage.value);
        const parentEntity = entityOrParent;

        if (target.hasComponents(["drive", "movable"])) {
          stopCruise(target);
        }
        if (shouldAttackBack(entity, target)) {
          if (target.cp.orders) {
            attack(target.requireComponents(["orders"]), entity);
          }
        } else if (
          target.cp.damage &&
          !target.tags.has("role:military") &&
          (!target.cp.damage.targetId ||
            (this.sim.get(target.cp.damage.targetId) &&
              !isInDistance(
                target.requireComponents(["damage"]),
                this.sim.get(target.cp.damage.targetId)!
              )))
        ) {
          target.cp.damage.targetId = parentEntity.id;
        }
        target.cp.subordinates?.ids.forEach((subordinateId) => {
          const subordinate = this.sim
            .getOrThrow(subordinateId)
            .requireComponents(["orders"]);

          if (subordinate.cp.orders.value[0]?.type === "escort") {
            attack(subordinate, parentEntity);
          }
        });
      }

      target.cooldowns.use(regenCooldown, 2);
    }
  };
}

export const attackingSystem = new AttackingSystem();
