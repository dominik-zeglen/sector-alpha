import { createShip } from "../archetypes/ship";
import type { Commodity } from "../economy/commodity";
import type { Sim } from "../sim";
import { System } from "./system";
import type { Faction } from "../archetypes/faction";
import type { Sector } from "../archetypes/sector";
import { hasSufficientStorage, removeStorage } from "../components/storage";
import { dockShip } from "./orderExecuting/dock";

export const shipBuildTimer = "shipBuild";

export class ShipBuildingSystem extends System<"exec"> {
  apply = (sim: Sim) => {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (): void => {
    if (this.cooldowns.canUse("exec")) {
      this.cooldowns.use("exec", 1);

      for (const shipyard of this.sim.index.shipyards.getIt()) {
        if (!shipyard.cooldowns.canUse(shipBuildTimer)) continue;

        if (shipyard.cp.shipyard.building) {
          const ship = createShip(this.sim, {
            ...shipyard.cp.shipyard.building.blueprint,
            position: shipyard.cp.position.coord.clone(),
            sector: this.sim.getOrThrow<Sector>(shipyard.cp.position.sector),
            owner: this.sim.getOrThrow<Faction>(
              shipyard.cp.shipyard.building.owner
            ),
            name: shipyard.cp.shipyard.building.blueprint.name,
          });
          dockShip(ship, shipyard);
          shipyard.cp.journal.entries.push({
            type: "shipyard",
            faction: shipyard.cp.shipyard.building.owner,
            name: ship.cp.name.value,
            price: 0,
            time: this.sim.getTime(),
          });
          shipyard.cp.shipyard.building = null;
        }

        if (shipyard.cp.shipyard.queue.length === 0) continue;
        const shipToBuild = shipyard.cp.shipyard.queue[0];

        if (
          Object.entries(shipToBuild.blueprint.build.cost).every(
            ([commodity, quantity]: [Commodity, number]) =>
              hasSufficientStorage(shipyard.cp.storage, commodity, quantity)
          )
        ) {
          Object.entries(shipToBuild.blueprint.build.cost).forEach(
            ([commodity, quantity]: [Commodity, number]) =>
              removeStorage(shipyard.cp.storage, commodity, quantity)
          );
          shipyard.cooldowns.use(
            shipBuildTimer,
            shipToBuild.blueprint.build.time
          );
          shipyard.cp.shipyard.queue.splice(0, 1);
          shipyard.cp.shipyard.building = shipToBuild;
        }
      }
    }
  };
}

export const shipBuildingSystem = new ShipBuildingSystem();
