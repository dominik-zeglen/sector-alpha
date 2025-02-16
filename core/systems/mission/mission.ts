import type { Reward } from "@core/components/missions";
import type { Sim } from "@core/sim";
import { pickRandom } from "@core/utils/generators";
import { first } from "@fxts/core";
import { actionLoader } from "@core/actionLoader";
import { System } from "../system";
import type { MissionHandler } from "./types";
import { rewards, missions } from "./mapping";

type MissionHandlers = Record<string, MissionHandler>;

export class MissionSystem extends System<"generate" | "track"> {
  handlers: {
    mission: MissionHandlers;
    rewards: Record<string, (_reward: Reward, _sim: Sim) => void>;
  };
  nextDelta: number;

  constructor() {
    super();
    this.handlers = {
      mission: {},
      rewards: {},
    };

    // eslint-disable-next-line guard-for-in
    for (const reward in rewards) {
      this.registerReward(reward, rewards[reward]);
    }

    // eslint-disable-next-line guard-for-in
    for (const mission in missions) {
      this.registerMission(mission, missions[mission]);
    }
  }

  apply(sim: Sim): void {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);

    actionLoader.register(
      {
        name: "Generate mission",
        slug: "generate",
        description: "Generate a new mission",
        category: "mission",
        type: "basic",
        fn: (_sim: Sim, template?: string) => {
          this.generate(true, template);
        },
      },
      this.constructor.name
    );
  }

  registerMission = (type: string, handler: MissionHandler) => {
    this.handlers.mission[type] = handler;
  };

  registerReward = (
    type: string,
    handler: (_reward: Reward, _sim: Sim) => void
  ) => {
    this.handlers.rewards[type] = handler;
  };

  track = () => {
    if (!this.cooldowns.canUse("track")) return;

    const player = first(this.sim.index.player.getIt())!;

    player.cp.missions.value.forEach((mission) => {
      this.handlers.mission[mission.type].update(
        mission,
        this.sim,
        this.nextDelta
      );
      mission.progress = this.handlers.mission[mission.type].formatProgress(
        mission,
        this.sim
      );

      if (this.handlers.mission[mission.type].isFailed(mission, this.sim)) {
        player.cp.missions.value = player.cp.missions.value.filter(
          (m) => m !== mission
        );

        return;
      }

      if (this.handlers.mission[mission.type].isCompleted(mission, this.sim)) {
        mission.rewards.forEach((reward) => {
          this.handlers.rewards[reward.type](reward, this.sim);
        });
        player.cp.missions.value = player.cp.missions.value.filter(
          (m) => m !== mission
        );
      }
    });

    this.nextDelta = 1 + Math.random();
    this.cooldowns.use("track", this.nextDelta);
  };

  generate = (force: boolean, template?: string) => {
    if (!this.cooldowns.canUse("generate") && !force) return;
    this.cooldowns.use("generate", 1 + Math.random());

    const player = this.sim.index.player.get()[0];

    if (
      !player.tags.has("mainQuestStarted") &&
      player.cp.missions.offer === null
    ) {
      player.cp.missions.offer = this.handlers.mission[
        "main.ffw.tutorial-miner"
      ].generate(this.sim);
      return;
    }

    if (
      force ||
      (player.cp.missions.value.every((m) => !m.type.includes("tutorial")) &&
        ((player.cp.missions.value.length < 3 &&
          this.sim.getTime() -
            Math.max(
              ...player.cp.missions.value.map((m) => m.accepted),
              player.cp.missions.declined
            ) >
            5 * 60) ||
          force) &&
        player.cp.missions.offer === null)
    ) {
      if (template) {
        player.cp.missions.offer = this.handlers.mission[template].generate(
          this.sim
        );
      } else {
        player.cp.missions.offer = pickRandom(
          Object.entries(this.handlers.mission)
            .filter(([key]) => key.startsWith("generic."))
            .map(([, data]) => data)
        ).generate(this.sim);
      }
    }
  };

  exec = () => {
    this.generate(false);
    this.track();
  };
}

export const missionSystem = new MissionSystem();
