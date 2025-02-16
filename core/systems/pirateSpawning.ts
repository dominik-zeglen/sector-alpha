import type { Faction } from "@core/archetypes/faction";
import type { Sector } from "@core/archetypes/sector";
import { sectorSize } from "@core/archetypes/sector";
import type { Ship } from "@core/archetypes/ship";
import { createShip, shipComponents } from "@core/archetypes/ship";
import { createWaypoint } from "@core/archetypes/waypoint";
import { addSubordinate } from "@core/components/subordinates";
import { isDev } from "@core/settings";
import type { Sim } from "@core/sim";
import { pickRandom } from "@core/utils/generators";
import { moveToActions } from "@core/utils/moving";
import { shipClasses } from "@core/world/ships";
import { filter, find, map, pipe, toArray } from "@fxts/core";
import { random, randomInt } from "mathjs";
import { fromPolar } from "@core/utils/misc";
import { System } from "./system";
import { EntityIndex } from "./utils/entityIndex";

const flagshipDistanceFromSectorCenter =
  ((1 + Math.random() / 5) * sectorSize) / 15;

function returnToFlagship(unassigned: Ship[], flagships: Ship[]) {
  if (unassigned.length && flagships.length) {
    unassigned.forEach((ship) => {
      if (ship.cp.orders.value.length || ship.cp.dockable.dockedIn) return;

      const closestFlagship = flagships.reduce((prev, cur) => {
        if (ship.cp.position.sector === cur.cp.position.sector) return cur;
        if (
          prev.cp.position.coord.squaredDistance(ship.cp.position.coord) >
          cur.cp.position.coord.squaredDistance(ship.cp.position.coord)
        )
          return cur;
        return prev;
      }, flagships[0]);

      ship.cp.orders.value = [
        {
          type: "dock",
          actions: [
            ...moveToActions(ship, closestFlagship),
            {
              type: "dock",
              targetId: closestFlagship.id,
            },
          ],
          origin: "auto",
        },
      ];
    });
  }
}

function spawnFlagship(sim: Sim, faction: Faction, flagships: Ship[]) {
  if (flagships.length > 6) return;

  const tau = find((f) => f.cp.name.slug === "TAU", sim.index.ai.getIt())!;
  const sector = pickRandom(
    sim.index.sectors
      .get()
      .filter(
        (s) =>
          flagships.every((f) => f.cp.position.sector !== s.id) &&
          s.cp.owner?.id !== tau.id
      )
  );

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Spawning pirate flagship in ${sector.cp.name.value}`);
  }

  const angle = Math.random() * 2 * Math.PI;
  createShip(sim, {
    ...shipClasses.find((sc) => sc.slug === "seahorse")!,
    owner: faction,
    sector,
    angle: Math.random() * 2 * Math.PI,
    position: fromPolar(angle, flagshipDistanceFromSectorCenter),
  });
}

function spawnSquad(
  sim: Sim,
  faction: Faction,
  squads: Array<{ commander: Ship; subordinates: Ship[] }>,
  flagships: Ship[],
  unassigned: Ship[]
) {
  if (!flagships.length || squads.length > 13) return;

  const flagship = pickRandom(flagships);
  const unassignedInSector = unassigned.filter(
    (s) => s.cp.position.sector === flagship.cp.position.sector
  );
  const squadSize = randomInt(2, 4);
  const squad = unassignedInSector.slice(0, squadSize);
  const currentSquadSize = squad.length;
  const sector = sim.getOrThrow<Sector>(flagship.cp.position.sector);
  for (let index = 0; index < squadSize - currentSquadSize; index++) {
    squad.push(
      createShip(sim, {
        ...shipClasses.find((sc) => sc.slug === "roach")!,
        owner: faction,
        position: flagship.cp.position.coord.clone(),
        sector,
      })
    );
  }

  if (
    !squad.some((s) => s.cp.model.slug === "stingray") &&
    Math.random() > 0.8
  ) {
    squad.push(
      createShip(sim, {
        ...shipClasses.find((sc) => sc.slug === "stingray")!,
        owner: faction,
        position: flagship.cp.position.coord.clone(),
        sector,
      })
    );
  }

  const commander =
    squad.find((s) => s.cp.model.slug === "stingray") ?? pickRandom(squad);
  squad.forEach((s) => {
    if (s !== commander) {
      addSubordinate(commander, s);
      s.cp.autoOrder.default = {
        type: "escort",
        targetId: commander.id,
      };
    }
  });

  commander.cp.autoOrder.default = {
    type: "pillage",
    clockwise: Math.random() > 0.5,
    sectorId: commander.cp.position.sector,
  };

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`Launching ${squad.length} pirates in ${sector.cp.name.value}`);
  }
}

export class PirateSpawningSystem extends System<
  "return" | "spawnFlagship" | "spawnSquad"
> {
  faction: Faction;
  index = new EntityIndex(shipComponents, ["role:military"]);

  moveFlagship = (flagships: Ship[]) => {
    const shipToMove = pickRandom(
      flagships.filter((s) => s.cp.orders.value.length === 0)
    );

    if (!shipToMove) return;

    const angle = Math.atan2(
      shipToMove.cp.position.coord[1],
      shipToMove.cp.position.coord[0]
    );
    const dAngle =
      (random(8, 20) * (Math.random() > 0.5 ? 1 : -1) * 2 * Math.PI) / 360;

    shipToMove.cp.orders.value.push({
      type: "move",
      actions: moveToActions(
        shipToMove,
        createWaypoint(this.sim, {
          sector: shipToMove.cp.position.sector,
          value: fromPolar(angle + dAngle, flagshipDistanceFromSectorCenter),
          owner: shipToMove.id,
        })
      ),
      origin: "auto",
    });
  };

  exec = (): void => {
    const ships = this.index.get();

    const squads = pipe(
      ships,
      filter(
        (s) =>
          s.cp.owner?.id === this.faction.id &&
          !s.cp.commander &&
          s.cp.subordinates.ids.length > 0
      ),
      map((s) => ({
        commander: s,
        subordinates: s.cp.subordinates.ids.map((id) =>
          this.sim.getOrThrow<Ship>(id)
        ),
      }))
    );

    const unassigned = filter(
      (s) =>
        s.cp.owner?.id === this.faction.id &&
        !s.cp.commander &&
        s.cp.orders.value.length === 0 &&
        s.cp.model.slug !== "seahorse",
      ships
    );
    const flagships = pipe(
      ships,
      filter(
        (s) =>
          s.cp.owner?.id === this.faction.id &&
          !s.cp.commander &&
          s.cp.model.slug === "seahorse"
      ),
      toArray
    );

    if (Math.random() < 0.02) {
      this.moveFlagship(flagships);
    }

    this.cooldowns.doEvery("spawnFlagship", 15 * 60, () =>
      spawnFlagship(this.sim, this.faction, toArray(flagships))
    );
    this.cooldowns.doEvery("spawnSquad", 3 * 60, () =>
      spawnSquad(
        this.sim,
        this.faction,
        toArray(squads),
        flagships,
        toArray(unassigned)
      )
    );
    this.cooldowns.doEvery("return", 1, () =>
      returnToFlagship(toArray(unassigned), toArray(flagships))
    );
  };

  apply = (sim: Sim) => {
    super.apply(sim);
    this.index.apply(sim);

    sim.hooks.phase.start.subscribe(this.constructor.name, () => {
      if (!this.faction) {
        this.faction = sim.index.ai
          .get()
          .find((f) => f.cp.name.slug === "PIR")!;
      }
    });

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };
}

export const pirateSpawningSystem = new PirateSpawningSystem();
