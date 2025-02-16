import Mustache from "mustache";
import type { Mission, MissionCommon } from "@core/components/missions";
import { filter, find, first, pipe, sort } from "@fxts/core";
import type { Sim } from "@core/sim";
import type { Facility } from "@core/archetypes/facility";
import type { MissionHandler } from "../../types";
import conversation from "../../../../world/data/missions/main/ffw/tutorial-trade.yml";

Mustache.escape = (text) => text;

interface MainFfwTutorialTradeMission extends Mission {
  minerId: number;
  facilityId: number;
  type: "main.ffw.tutorial-trade";
}

export const mainFfwTutorialTradeMission = (
  minerId: number,
  facilityId: number,
  common: MissionCommon
): MainFfwTutorialTradeMission => ({
  ...common,
  minerId,
  facilityId,
  type: "main.ffw.tutorial-trade",
});

export const isMainFfwTutorialTradeMission = (
  mission: Mission
): mission is MainFfwTutorialTradeMission =>
  mission.type === "main.ffw.tutorial-trade";

export const mainFfwTutorialTradeMissionHandler: MissionHandler = {
  generate: (_sim) => ({
    conversation,
    rewards: [],
    type: "main.ffw.tutorial-trade",
    immediate: true,
  }),
  accept: (sim, _offer) => {
    const player = first(sim.index.player.getIt())!;
    const miner = find(
      (s) => s.cp.owner.id === player.id && s.cp.mining,
      sim.index.ships.getIt()
    )!;
    const nearestFacility = pipe(
      sim.index.facilities.getIt(),
      filter(
        (f) =>
          f.cp.trade?.offers?.ore.active &&
          f.cp.trade.offers.ore.type === "buy" &&
          f.cp.position.sector === miner.cp.position.sector
      ),
      sort(
        (a, b) =>
          a.cp.position.coord.distance(miner.cp.position.coord) >
          b.cp.position.coord.distance(miner.cp.position.coord)
      ),
      first
    );
    nearestFacility!.addTag("discovered");

    return mainFfwTutorialTradeMission(miner.id, nearestFacility!.id, {
      accepted: sim.getTime(),
      cancellable: false,
      description:
        "Commander Russo ordered you to sell the mined resources to the facility. You can do this by selecting the ship and right-clicking on the station.",
      references: [
        { id: nearestFacility!.id, name: nearestFacility!.cp.name!.value },
        { id: miner!.id, name: miner!.cp.name!.value },
      ],
      rewards: [
        {
          type: "mission",
          mission: "main.ffw.tutorial-autoorder",
        },
      ],
      title: "Tutorial: Trading",
    });
  },
  isFailed: (mission, _sim) => {
    if (!isMainFfwTutorialTradeMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-trade mission");

    return false;
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isMainFfwTutorialTradeMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-trade mission");

    const facility = sim.getOrThrow<Facility>(mission.facilityId);
    return !!facility.cp.journal.entries.find(
      (entry) =>
        entry.type === "trade" &&
        entry.action === "buy" &&
        entry.targetId === mission.minerId &&
        entry.commodity === "ore" &&
        entry.quantity > 0
    );
  },
  update: (mission: Mission, _sim: Sim) => {
    if (!isMainFfwTutorialTradeMission(mission))
      throw new Error("Mission is not a main.ffw.tutorial-trade mission");
  },
  formatProgress: (_mission: MainFfwTutorialTradeMission) => "",
};
