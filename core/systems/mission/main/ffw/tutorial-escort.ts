import { shipClasses } from "@core/world/ships";
import Mustache from "mustache";
import type { Mission, MissionCommon } from "@core/components/missions";
import { find, first } from "@fxts/core";
import type { Sim } from "@core/sim";
import type { Ship } from "@core/archetypes/ship";
import { createShip } from "@core/archetypes/ship";
import type { Sector } from "@core/archetypes/sector";
import { distance, random } from "mathjs";
import type { FacilityModule } from "@core/archetypes/facilityModule";
import conversation from "../../../../world/data/missions/main/ffw/tutorial-escort.yml";
import type { MissionHandler } from "../../types";

Mustache.escape = (text) => text;

interface MainFfwTutorialEscortMission extends Mission {
  minerId: number;
  fighterId: number;
  type: "main.ffw.tutorial-escort";
}

export const mainFfwTutorialEscortMission = (
  minerId: number,
  fighterId: number,
  common: MissionCommon
): MainFfwTutorialEscortMission => ({
  ...common,
  minerId,
  fighterId,
  type: "main.ffw.tutorial-escort",
});

export const isMainFfwTutorialEscortMission = (
  mission: Mission
): mission is MainFfwTutorialEscortMission =>
  mission.type === "main.ffw.tutorial-escort";

export const mainFfwTutorialEscortMissionHandler: MissionHandler = {
  generate: (_sim) => ({
    conversation,
    rewards: [],
    type: "main.ffw.tutorial-escort",
    immediate: true,
  }),
  accept: (sim, _offer) => {
    const player = first(sim.queries.player.getIt())!;
    const miner = find(
      (s) => s.cp.owner.id === player.id && s.cp.mining,
      sim.queries.ships.getIt()
    )!;
    const hub = find(
      (f) =>
        f.cp.position.sector === miner.cp.position.sector &&
        f.cp.modules.ids.some((fm) =>
          sim.getOrThrow<FacilityModule>(fm).hasTags(["facilityModuleType:hub"])
        ),
      sim.queries.facilities.getIt()
    )!;
    const escort = createShip(sim, {
      ...shipClasses.find(({ slug }) => slug === "dart")!,
      angle: 0,
      position: [
        hub.cp.position.coord[0] + random(-0.1, 0.1),
        hub.cp.position.coord[1] + random(-0.1, 0.1),
      ],
      owner: player,
      sector: sim.getOrThrow<Sector>(miner.cp.position.sector),
    });

    return mainFfwTutorialEscortMission(miner.id, escort.id, {
      accepted: sim.getTime(),
      cancellable: false,
      description: "Use Dart fighter to escort your miner",
      progress: { max: 0, current: 0 },
      references: [
        { id: miner!.id, name: miner!.cp.name!.value },
        { id: escort!.id, name: escort!.cp.name!.value },
      ],
      rewards: [
        {
          type: "mission",
          mission: "main.ffw.tutorial-pirates",
        },
      ],
      title: "Tutorial: Escorting",
    });
  },
  isFailed: (mission, sim) => {
    if (!isMainFfwTutorialEscortMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-escort mission");

    return !sim.get(mission.minerId) || !sim.get(mission.fighterId);
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isMainFfwTutorialEscortMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-escort mission");
    const fighter = sim.getOrThrow<Ship>(mission.fighterId);
    const miner = sim.getOrThrow<Ship>(mission.minerId);

    return (
      miner.cp.autoOrder.default.type === "mine" &&
      fighter.cp.orders.value[0]?.type === "escort" &&
      fighter.cp.orders.value[0].targetId === mission.minerId &&
      fighter.cp.position.sector === miner.cp.position.sector &&
      (distance(fighter.cp.position.coord, miner.cp.position.coord) as number) <
        2
    );
  },
  update: (mission: Mission, _sim: Sim) => {
    if (!isMainFfwTutorialEscortMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-escort mission");
  },
  formatProgress: (_mission: MainFfwTutorialEscortMission) => "",
};
