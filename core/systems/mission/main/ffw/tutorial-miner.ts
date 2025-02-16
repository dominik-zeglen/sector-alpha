import Mustache from "mustache";
import type { Mission, MissionCommon } from "@core/components/missions";
import { random } from "mathjs";
import { find, first } from "@fxts/core";
import { createShip } from "@core/archetypes/ship";
import { shipClasses } from "@core/world/ships";
import type { Sim } from "@core/sim";
import { fromPolar } from "@core/utils/misc";
import type { MissionHandler } from "../../types";
import conversation from "../../../../world/data/missions/main/ffw/tutorial-miner.yml";
import type { MissionReward } from "../../rewards";

Mustache.escape = (text) => text;

interface MainFfwTutorialMinerMission extends Mission {
  type: "main.ffw.tutorial-miner";
}

export const mainFfwTutorialMinerMission = (
  minerId: number,
  common: MissionCommon
): MainFfwTutorialMinerMission => ({
  ...common,
  minerId,
  type: "main.ffw.tutorial-miner",
});

export const isMainFfwTutorialMinerMission = (
  mission: Mission
): mission is MainFfwTutorialMinerMission =>
  mission.type === "main.ffw.tutorial-miner";

export const mainFfwTutorialMinerMissionHandler: MissionHandler = {
  generate: (_sim) => ({
    conversation,
    rewards: [
      {
        mission: "main.ffw.tutorial-trade",
        type: "mission",
      } as MissionReward,
    ],
    type: "main.ffw.tutorial-miner",
    immediate: true,
  }),
  accept: (sim, offer) => {
    const player = first(sim.index.player.getIt())!;
    player.addTag("mainQuestStarted");
    const sector = find(
      (s) => s.cp.name.value === "Teegarden's Star II",
      sim.index.sectors.get()
    )!;

    const miner = createShip(sim, {
      ...shipClasses.find(({ slug }) => slug === "smallMinerA")!,
      angle: random(-Math.PI, Math.PI),
      position: fromPolar(random(-Math.PI, Math.PI), random(0, 1)),
      owner: player,
      sector,
    });
    miner.cp.autoOrder!.default = { type: "hold" };

    return mainFfwTutorialMinerMission(miner.id, {
      accepted: sim.getTime(),
      title: "Tutorial: Mining",
      description:
        "Commander Russo has requested that you mine some ore as a part of your training.",
      rewards: offer.rewards,
      references: [{ id: miner.id, name: miner.cp.name.value }],
      cancellable: false,
    });
  },
  isFailed: (mission, sim) => {
    if (!isMainFfwTutorialMinerMission(mission))
      throw new Error("Mission is not a mainFfwTutorialMiner mission");

    return !sim.get(mission.minerId);
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isMainFfwTutorialMinerMission(mission))
      throw new Error("Mission is not a mainFfwTutorialMiner mission");

    const miner = sim
      .getOrThrow(mission.minerId)
      .requireComponents(["mining", "storage"]);
    return miner.cp.storage.max === miner.cp.storage.stored.ore;
  },
  update: (mission: Mission, _sim: Sim) => {
    if (!isMainFfwTutorialMinerMission(mission))
      throw new Error("Mission is not a mainFfwTutorialMiner mission");
  },
  formatProgress: (_mission: MainFfwTutorialMinerMission) =>
    "0 / 1 miners working",
};
