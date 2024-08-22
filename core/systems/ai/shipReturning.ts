import type { Faction } from "@core/archetypes/faction";
import { createWaypoint } from "@core/archetypes/waypoint";
import type { Sim } from "@core/sim";
import { moveToActions } from "@core/utils/moving";
import { each, filter, first, map, pipe, sortBy } from "@fxts/core";
import { random } from "mathjs";
import { System } from "../system";

/**
 * Return crafts left without orders to owned sectors
 */
export class ShipReturningSystem extends System<"exec"> {
  apply = (sim: Sim) => {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (): void => {
    if (!this.cooldowns.canUse("exec")) return;
    this.cooldowns.use("exec", 3);

    pipe(
      this.sim.queries.orderable.getIt(),
      filter(
        (ship) =>
          ship.cp.orders.value.length === 0 &&
          (ship.cp.autoOrder
            ? ship.cp.autoOrder?.default.type === "hold"
            : true) &&
          !this.sim.getOrThrow<Faction>(ship.cp.owner.id).tags.has("player") &&
          !this.sim.queries.sectors
            .get()
            .filter((e) => e.cp.owner?.id === ship.cp.owner.id)
            .map((e) => e.id)
            .includes(ship.cp.position.sector)
      ),
      each((ship) => {
        const closestSector = pipe(
          this.sim.queries.sectors.getIt(),
          filter((s) => s.cp.owner?.id === ship.cp.owner.id),
          map((s) => ({
            sector: s,
            distance:
              this.sim.paths[ship.cp.position.sector.toString()][
                s.id.toString()
              ].distance,
          })),
          sortBy(({ distance }) => distance),
          map(({ sector }) => sector),
          first
        )!;

        if (closestSector) {
          ship.cp.orders.value.push({
            type: "move",
            actions: moveToActions(
              ship,
              createWaypoint(this.sim, {
                sector: closestSector.id,
                owner: ship.id,
                value: [random(-5, 5), random(-5, 5)],
              })
            ),
            origin: "auto",
          });
        }
      })
    );
  };
}

export const shipReturningSystem = new ShipReturningSystem();
