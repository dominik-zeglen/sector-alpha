import { shipClasses } from "@core/world/ships";
import Mustache from "mustache";
import type { Mission, MissionCommon } from "@core/components/missions";
import { find, first } from "@fxts/core";
import type { Sim } from "@core/sim";
import { createShip } from "@core/archetypes/ship";
import type { Sector } from "@core/archetypes/sector";
import { fromPolar } from "@core/utils/misc";
import conversation from "../../../../world/data/missions/main/ffw/tutorial-pirates.yml";
import endConversation from "../../../../world/data/missions/main/ffw/tutorial-end.yml";
import type { MissionHandler } from "../../types";

Mustache.escape = (text) => text;

interface MainFfwTutorialPiratesMission extends Mission {
  minerId: number;
  pirateIds: number[];
  type: "main.ffw.tutorial-pirates";
}

export const mainFfwTutorialPiratesMission = (
  minerId: number,
  pirateIds: number[],
  common: MissionCommon
): MainFfwTutorialPiratesMission => ({
  ...common,
  minerId,
  pirateIds,
  type: "main.ffw.tutorial-pirates",
});

export const isMainFfwTutorialPiratesMission = (
  mission: Mission
): mission is MainFfwTutorialPiratesMission =>
  mission.type === "main.ffw.tutorial-pirates";

export const mainFfwTutorialPiratesMissionHandler: MissionHandler = {
  generate: (_sim) => ({
    conversation,
    rewards: [],
    type: "main.ffw.tutorial-pirates",
    immediate: true,
  }),
  accept: (sim, _offer) => {
    const player = first(sim.index.player.getIt())!;
    const miner = find(
      (s) => s.cp.owner.id === player.id && s.cp.mining,
      sim.index.ships.getIt()
    )!;
    const pirateFaction = find(
      (f) => f.cp.name.slug === "PIR",
      sim.index.ai.get()
    )!;
    const pirates = Array(2)
      .fill(0)
      .map(() =>
        createShip(sim, {
          ...shipClasses.find(({ slug }) => slug === "roach")!,
          angle: Math.random() * Math.PI * 2,
          position: fromPolar(Math.random() * Math.PI * 2, 10).add(
            miner.cp.position.coord
          ),
          owner: pirateFaction,
          sector: sim.getOrThrow<Sector>(miner.cp.position.sector),
        })
      );
    for (const pirate of pirates) {
      pirate.cp.orders!.value.push({
        origin: "manual",
        type: "attack",
        targetId: miner.id,
        actions: [],
        ordersForSector: 0,
        followOutsideSector: true,
      });
    }

    return mainFfwTutorialPiratesMission(
      miner.id,
      pirates.map((pirate) => pirate.id),
      {
        accepted: sim.getTime(),
        cancellable: false,
        description:
          "This part of training requires you to defend your miner from pirates.",
        references: [
          { id: miner!.id, name: miner!.cp.name!.value },
          ...pirates.map((pirate) => ({
            id: pirate!.id,
            name: pirate!.cp.name!.value,
          })),
        ],
        rewards: [
          {
            type: "conversation",
            conversation: endConversation,
          },
        ],
        title: "Tutorial: Pirates",
      }
    );
  },
  isFailed: (mission, sim) => {
    if (!isMainFfwTutorialPiratesMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-pirates mission");

    return !sim.get(mission.minerId);
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isMainFfwTutorialPiratesMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-pirates mission");

    return !mission.pirateIds.some(sim.get);
  },
  update: (mission: Mission, _sim: Sim) => {
    if (!isMainFfwTutorialPiratesMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-pirates mission");
  },
  formatProgress: (mission: MainFfwTutorialPiratesMission, sim) => {
    const remainingPirates = mission.pirateIds.filter(
      (id) => !sim.get(id)
    ).length;

    return `${mission.pirateIds.length - remainingPirates} / ${
      mission.pirateIds.length
    } pirates destroyed`;
  },
};
