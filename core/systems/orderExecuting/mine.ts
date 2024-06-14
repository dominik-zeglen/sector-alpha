import { asteroid } from "../../archetypes/asteroid";
import { asteroidField, spawn } from "../../archetypes/asteroidField";
import type { MineAction } from "../../components/orders";
import { getAvailableSpace } from "../../components/storage";
import { getMineableAsteroid } from "../../economy/utils";
import type { RequireComponent } from "../../tsHelpers";
import { moveToActions, stop } from "../../utils/moving";

export function mineAction(
  entity: RequireComponent<
    "drive" | "mining" | "movable" | "position" | "storage"
  >,
  order: MineAction
): boolean {
  const targetField = asteroidField(entity.sim.getOrThrow(order.targetFieldId));
  const targetRock = order.targetRockId
    ? entity.sim.get(order.targetRockId)
    : null;

  if (
    !targetRock ||
    (targetRock.cp.minable!.minedById !== null &&
      targetRock.cp.minable!.minedById !== entity.id)
  ) {
    let rock = getMineableAsteroid(targetField);
    if (!rock) {
      if (targetField.cp.asteroidSpawn.amount > 0) {
        rock = spawn(targetField);
      } else {
        return true;
      }
    }
    order.targetRockId = rock.id;
    entity.cp.orders!.value[0].actions.unshift(...moveToActions(entity, rock));
  }

  if (entity.cp.drive.targetReached) {
    const rock = asteroid(entity.sim.getOrThrow(order.targetRockId!));
    entity.cp.mining.entityId = order.targetRockId;
    rock.cp.minable.minedById = entity.id;
    stop(entity);

    if (getAvailableSpace(entity.cp.storage) === 0) {
      entity.cp.mining.entityId = null;
      rock.cp.minable.minedById = null;

      return true;
    }
  }

  return false;
}
