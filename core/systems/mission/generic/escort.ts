import type { Mission, MissionCommon } from "@core/components/missions";
import { filter, find, pipe, toArray } from "@fxts/core";
import type { Sim } from "@core/sim";
import { mustacheConversation, pickRandom } from "@core/utils/generators";
import shipNames from "@core/world/data/shipNames.json";
import { random, randomInt } from "mathjs";
import type { Facility } from "@core/archetypes/facility";
import { facility } from "@core/archetypes/facility";
import type { Faction } from "@core/archetypes/faction";
import { relationThresholds } from "@core/components/relations";
import { hecsDistance } from "@core/components/hecsPosition";
import type { TradeAction } from "@core/components/orders";
import { trade } from "@core/systems/orderExecuting/trade";
import { moveToActions, teleport } from "@core/utils/moving";
import { fromPolar } from "@core/utils/misc";
import { waypoint } from "@core/archetypes/waypoint";
import { createShipName } from "@core/archetypes/ship";
import type { MissionHandler } from "../types";
import conversationTemplate from "../../../world/data/missions/generic/escort.yml";
import conversationEndTemplate from "../../../world/data/missions/generic/escort-end.yml";

const maxEscortDistance = 2;

function getRoute(
  sim: Sim,
  faction: Faction,
  hops: number
): [Facility, Facility] {
  for (let counter = 0; counter < 1000; counter++) {
    const availableOriginSectors = pipe(
      sim.index.sectors.get(),
      filter((s) => s.cp.owner?.id === faction.id),
      toArray
    );
    if (!availableOriginSectors.length) continue;

    const originSector = pickRandom(availableOriginSectors);
    const availableTargetSectors = pipe(
      sim.index.sectors.get(),
      filter(
        (s) =>
          Object.entries(faction.cp.relations.values)
            .filter(([, value]) => value >= relationThresholds.trade)
            .map(([id]) => Number(id))
            .includes(s.cp.owner?.id!) &&
          hecsDistance(
            originSector.cp.hecsPosition.value,
            s.cp.hecsPosition.value
          ) === hops
      ),
      toArray
    );
    if (!availableTargetSectors.length) continue;

    const targetSector = pickRandom(availableTargetSectors);
    const origin = pickRandom(
      pipe(
        sim.index.facilities.getIt(),
        filter(
          (f) =>
            f.cp.owner?.id === faction.id &&
            f.cp.position.sector === originSector.id
        ),
        toArray
      )
    );
    const target = pickRandom(
      pipe(
        sim.index.facilities.getIt(),
        filter(
          (f) =>
            Object.entries(faction.cp.relations.values)
              .filter(([, value]) => value >= relationThresholds.trade)
              .map(([id]) => Number(id))
              .includes(f.cp.owner?.id!) &&
            f.cp.position.sector === targetSector.id
        ),
        toArray
      )
    );
    return [facility(origin), facility(target)];
  }

  throw new Error(
    `Cannot find any route of length ${hops} for ${faction.cp.name.slug}`
  );
}

interface GenericEscortMissionData {
  originId: number;
  destinationId: number;
  factionId: number;
  shipName: string;
  freighterId: number;
}

interface GenericEscortMission extends Mission {
  data: GenericEscortMissionData;
  type: "generic.escort";
}

export const genericEscortMission = (
  data: GenericEscortMissionData,
  common: MissionCommon
): GenericEscortMission => ({
  ...common,
  data,
  type: "generic.escort",
});

export const isGenericEscortMission = (
  mission: Mission
): mission is GenericEscortMission => mission.type === "generic.escort";

export const genericEscortMissionHandler: MissionHandler = {
  generate: (sim) => {
    const hops = randomInt(2, 4);
    const faction = sim.index.ai.get().find((f) => f.cp.name.slug === "FFW")!;
    const [origin, destination] = getRoute(sim, faction, hops);
    const shipName = pickRandom(shipNames.ffw.freighter);
    const reward = {
      type: "money",
      amount: Math.round(hops * random(15, 20) * 1e3),
    };
    const conversation = mustacheConversation(conversationTemplate, {
      shipName,
      faction: faction.cp.name.value,
      origin: origin.cp.name.value,
      destination: destination.cp.name.value,
      reward: reward.amount.toString(),
    });
    const data: GenericEscortMissionData = {
      destinationId: destination.id,
      originId: origin.id,
      shipName,
      factionId: faction.id,
      freighterId: null!, // Not available at offer stage
    };

    return {
      conversation,
      rewards: [
        reward,
        {
          type: "conversation",
          conversation: mustacheConversation(conversationEndTemplate, {
            shipName,
          }),
        },
      ],
      type: "generic.escort",
      data,
      immediate: false,
    };
  },
  accept: (sim, offer) => {
    const data: GenericEscortMissionData = offer.data;

    const freighter = pickRandom(
      pipe(
        sim.index.ships.getIt(),
        filter((s) => s.cp.commander?.id === data.originId),
        toArray
      )
    );
    freighter.cp.name.value = createShipName(freighter, data.shipName);

    if (freighter.cp.orders.value.length !== 0) {
      for (const order of freighter.cp.orders.value) {
        if (order.type === "trade") {
          const tradeAction = order.actions.find(
            (a) => a.type === "trade"
          ) as TradeAction;
          trade(
            tradeAction,
            freighter,
            sim
              .getOrThrow(tradeAction.targetId)
              .requireComponents([
                "storage",
                "trade",
                "journal",
                "budget",
                "docks",
                "owner",
                "position",
              ])
          );
        }
      }
      freighter.cp.orders.value = [
        { type: "hold", origin: "mission:escort", actions: [] },
      ];
    }
    const origin = sim
      .getOrThrow(data.originId)
      .requireComponents(["position", "name"]);
    const destination = sim
      .getOrThrow(data.destinationId)
      .requireComponents(["name"]);
    teleport(
      freighter,
      fromPolar(random(0, 2 * Math.PI), random(1, 3)).add(
        origin.cp.position.coord
      ),
      origin.cp.position.sector
    );
    data.freighterId = freighter.id;

    return genericEscortMission(data, {
      accepted: sim.getTime(),
      cancellable: true,
      description: `You were asked to escort ${data.shipName} from ${origin.cp.name.value} to ${destination.cp.name.value}.`,
      references: [
        {
          id: origin.id,
          name: origin.cp.name.value,
        },
        {
          id: freighter.id,
          name: freighter.cp.name.value,
        },
        {
          id: destination.id,
          name: destination.cp.name.value,
        },
      ],
      rewards: offer.rewards,
      title: `Escort ${data.shipName} to ${destination.cp.name.value}`,
    });
  },
  isFailed: (mission, sim) => {
    if (!isGenericEscortMission(mission))
      throw new Error("Mission is not a generic.escort mission");

    return !sim.get(mission.data.freighterId);
  },
  isCompleted: (mission: Mission, sim) => {
    if (!isGenericEscortMission(mission))
      throw new Error("Mission is not a generic.escort mission");

    return (
      sim.getOrThrow(mission.data.freighterId).requireComponents(["dockable"])
        .cp.dockable.dockedIn === mission.data.destinationId
    );
  },
  update: (mission: Mission, sim: Sim) => {
    if (!isGenericEscortMission(mission))
      throw new Error("Mission is not a generic.escort mission");

    const freighter = sim
      .get(mission.data.freighterId)
      ?.requireComponents(["position", "orders"]);

    if (!freighter) return;

    const shipInDistance = pipe(
      sim.index.ships.getIt(),
      find(
        (s) =>
          s.tags.has("role:military") &&
          s.cp.position.sector === freighter.cp.position.sector &&
          freighter.cp.position.coord.distance(s.cp.position.coord) <=
            maxEscortDistance
      )
    );

    if (shipInDistance) {
      freighter.cp.orders.value = [
        {
          type: "trade",
          actions: [
            ...moveToActions(
              freighter,
              waypoint(sim.getOrThrow(mission.data.destinationId))
            ),
            { type: "dock", targetId: mission.data.destinationId },
          ],
          origin: "mission:escort",
        },
      ];
    } else {
      freighter.cp.orders.value = [
        { type: "hold", origin: "mission:escort", actions: [] },
      ];
    }
  },
  formatProgress: (_mission: GenericEscortMission) => "",
};
