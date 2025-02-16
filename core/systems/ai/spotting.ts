import { filter, map, pipe, sort, toArray } from "@fxts/core";
import type { Faction } from "@core/archetypes/faction";
import { relationThresholds } from "@core/components/relations";
import type { RequireComponent } from "@core/tsHelpers";
import { pickRandom } from "@core/utils/generators";
import { System } from "../system";
import type { Sim } from "../../sim";
import { SectorIndex } from "../utils/sectorIndex";

export const spottingRadius = 7;

export type EnemyArrayCache = Record<
  string,
  Array<RequireComponent<"hitpoints" | "owner" | "position">>
>;

export class SpottingSystem extends System<"exec"> {
  index = new SectorIndex(["hitpoints", "owner", "position"]);

  apply = (sim: Sim) => {
    super.apply(sim);
    this.index.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  static getEnemies(
    potentialEnemies: RequireComponent<"hitpoints" | "owner" | "position">[],
    cache: EnemyArrayCache,
    entity: RequireComponent<"owner" | "position">
  ) {
    const entityOwner = entity.sim.getOrThrow<Faction>(entity.cp.owner.id);

    const cacheKey = [
      entity.cp.owner!.id,
      entity.cp.position.sector,
      entity.cp.orders?.value[0]?.type === "pillage" ? "pillage" : "default",
    ].join(":");
    const enemies =
      cache[cacheKey] ??
      pipe(
        potentialEnemies,
        filter((e) => {
          const isMiningOnRestrictedArea =
            entityOwner.cp.ai?.restrictions.mining && e.cp.mining?.entityId;
          const isSubjectToPillaging =
            entity.cp.orders?.value[0]?.type === "pillage" &&
            entityOwner.cp.relations.values[e.cp.owner.id]! <= 0 &&
            (e.tags.has("role:transport") || e.tags.has("role:mining")) &&
            (e.cp.dockable?.size === "small" ||
              e.cp.dockable?.size === "medium");
          const isEnemy =
            entityOwner.cp.relations.values[e.cp.owner.id]! <
            relationThresholds.attack;

          return (
            e.cp.owner.id !== entityOwner.id &&
            (isMiningOnRestrictedArea || isSubjectToPillaging || isEnemy)
          );
        }),
        toArray
      );
    if (!cache[cacheKey]) {
      cache[cacheKey] = enemies;
    }

    return pipe(
      enemies,
      map((e) => ({
        entity: e,
        distance: e.cp.position.coord.distance(entity.cp.position.coord),
      })),
      sort((a, b) => (a.distance > b.distance ? 1 : -1)),
      toArray
    );
  }

  exec = (): void => {
    if (!this.cooldowns.canUse("exec")) return;

    const cache: EnemyArrayCache = {};

    for (const entity of this.sim.index.orderable.getIt()) {
      const currentOrder = entity.cp.orders.value[0];
      const owner = entity.sim.getOrThrow<Faction>(entity.cp.owner.id);

      if (
        !(
          ["patrol", "pillage", "escort"].includes(currentOrder?.type) ||
          owner.cp.policies.enemySpotted[
            entity.tags.has("role:military") ? "military" : "civilian"
          ] === "attack"
        ) ||
        currentOrder?.type === "attack" ||
        !entity.cp.owner ||
        ((currentOrder?.type === "patrol" ||
          currentOrder?.type === "pillage") &&
          entity.cp.position.sector !== currentOrder.sectorId)
      )
        continue;

      const enemy = pickRandom(
        SpottingSystem.getEnemies(
          this.index.get(entity.cp.position.sector),
          cache,
          entity
        ).slice(0, 3)
      );

      if (enemy?.distance <= spottingRadius) {
        currentOrder.interrupt = true;
        entity.cp.orders.value.splice(1, 0, {
          type: "attack",
          ordersForSector: entity.cp.position.sector,
          origin: "auto",
          targetId: enemy.entity.id,
          actions: [],
          followOutsideSector: false,
          maxDistance:
            currentOrder.type === "pillage" ? spottingRadius * 1.1 : undefined,
        });
      }
    }

    this.cooldowns.use("exec", 1 + Math.random());
  };
}

export const spottingSystem = new SpottingSystem();
