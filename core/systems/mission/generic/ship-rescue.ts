import type { Mission, MissionCommon } from "@core/components/missions";
import { filter, first, map, pipe, toArray } from "@fxts/core";
import type { Sim } from "@core/sim";
import { mustacheConversation, pickRandom } from "@core/utils/generators";
import type { Sector } from "@core/archetypes/sector";
import shipNames from "@core/world/data/shipNames.json";
import { shipClasses } from "@core/world/ships";
import type { Ship } from "@core/archetypes/ship";
import { createShip, createShipName } from "@core/archetypes/ship";
import { random } from "mathjs";
import { fromPolar } from "@core/utils/misc";
import { getSectorsInTeleportRange } from "@core/economy/utils";
import { teleport } from "@core/utils/moving";
import template from "../../../world/data/missions/generic/ship-rescue.yml";
import templateEnd from "../../../world/data/missions/generic/ship-rescue-end.yml";
import type { MissionHandler } from "../types";

interface GenericShipRescueMission extends Mission {
  shipId: number;
  pirateIds: number[];
  type: "generic.ship-rescue";
}

export const genericShipRescueMission = (
  shipId: number,
  pirateIds: number[],
  common: MissionCommon
): GenericShipRescueMission => ({
  ...common,
  shipId,
  pirateIds,
  type: "generic.ship-rescue",
});

export const isGenericShipRescueMission = (
  mission: Mission
): mission is GenericShipRescueMission =>
  mission.type === "generic.ship-rescue";

export const genericShipRescueMissionHandler: MissionHandler = {
  generate: (sim) => {
    const player = first(sim.index.player.getIt())!;
    // Teleport ship instead of creating new one to avoid accidental
    // strenthening faction's fleet
    const playerShip = pickRandom(
      pipe(
        sim.index.ships.getIt(),
        filter((ship) => ship.cp.owner.id === player.id),
        toArray
      )
    );
    const isMiner = Math.random() > 0.5;
    const shipName = pickRandom(shipNames.ffw[isMiner ? "miner" : "freighter"]);
    const sectorsInRange = pipe(
      getSectorsInTeleportRange(
        sim.getOrThrow<Sector>(playerShip.cp.position.sector),
        2,
        sim
      ),
      map((s) => s.id),
      toArray
    );
    const ffw = sim.index.ai.get().find((f) => f.cp.name.slug === "FFW")!;
    const ship = pickRandom(
      pipe(
        sim.index.ships.getIt(),
        filter(
          (s) =>
            s.cp.owner.id === ffw.id &&
            s.tags.has(isMiner ? "role:mining" : "role:transport") &&
            s.cp.dockable.size === "medium" &&
            sectorsInRange.includes(s.cp.position.sector)
        ),
        toArray
      )
    );
    if (!ship) return null;

    const sector = sim.getOrThrow<Sector>(playerShip.cp.position.sector);

    const conversation = mustacheConversation(template, {
      ship: shipName,
      sector: sector.cp.name.value,
    });

    return {
      conversation,
      rewards: [],
      type: "generic.ship-rescue",
      immediate: false,
      data: {
        sector: sector.id,
        playerShip: playerShip.id,
        shipName,
        shipId: ship.id,
        isMiner,
      },
    };
  },
  accept: (sim, offer) => {
    const playerShip = sim.getOrThrow<Ship>(offer.data!.playerShip);
    const ship = sim.getOrThrow<Ship>(offer.data!.shipId);
    teleport(
      ship,
      fromPolar(random(-Math.PI, Math.PI), 6).add(playerShip.cp.position.coord),
      playerShip.cp.position.sector
    );
    ship.cp.orders.value = [];
    ship.cp.name.value = createShipName(ship, offer.data!.shipName);
    const pirates = Array(3)
      .fill(0)
      .map(() =>
        createShip(sim, {
          ...pickRandom(shipClasses.filter(({ slug }) => slug === "roach")),
          angle: random(-Math.PI, Math.PI),
          position: fromPolar(random(-Math.PI, Math.PI), 3).add(
            ship.cp.position.coord
          ),
          owner: sim.index.ai.get().find((f) => f.cp.name.slug === "PIR")!,
          sector: sim.getOrThrow<Sector>(ship.cp.position.sector),
        })
      );
    pirates.forEach((p) => {
      p.cp.orders.value.push({
        type: "attack",
        targetId: ship.id,
        actions: [],
        followOutsideSector: true,
        ordersForSector: ship.cp.position.sector,
        origin: "mission:generic.ship-rescue",
      });
    });

    return genericShipRescueMission(
      ship.id,
      pirates.map((p) => p.id),
      {
        accepted: sim.getTime(),
        cancellable: true,
        description: `Captain of the ${ship.cp.name.value} is in distress, struggling to deal with pirate attacks. Rescue them before it's too late.`,
        references: [
          {
            id: ship.id,
            name: ship.cp.name.value,
          },
          ...pirates.map((p) => ({
            id: p.id,
            name: p.cp.name.value,
          })),
        ],
        rewards: [
          {
            type: "money",
            amount: random(20000, 35000),
          },
          {
            type: "conversation",
            conversation: mustacheConversation(templateEnd, {
              ship: offer.data!.shipName,
            }),
          },
        ],
        title: `Rescue ${ship.cp.name.value}`,
      }
    );
  },
  isFailed: (mission, sim) => {
    if (!isGenericShipRescueMission(mission))
      throw new Error("Mission is not a generic.ship-rescue mission");

    return !sim.get(mission.shipId);
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isGenericShipRescueMission(mission))
      throw new Error("Mission is not a generic.ship-rescue mission");

    return (
      !!sim.getOrThrow(mission.shipId) &&
      mission.pirateIds.every((id) => !sim.get(id))
    );
  },
  update: (mission: Mission, _sim) => {
    if (!isGenericShipRescueMission(mission))
      throw new Error("Mission is not a generic.ship-rescue mission");
  },
  formatProgress: (mission: GenericShipRescueMission, sim: Sim) => {
    const remainingPirates = mission.pirateIds.filter(
      (id) => !sim.get(id)
    ).length;

    return `${mission.pirateIds.length - remainingPirates}/${
      mission.pirateIds.length
    } pirates defeated`;
  },
};
