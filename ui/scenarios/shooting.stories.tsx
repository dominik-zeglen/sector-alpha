import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { Sim } from "@core/sim";
import { cooldownUpdatingSystem } from "@core/systems/cooldowns";
import { attackingSystem } from "@core/systems/attacking";
import { createSector } from "@core/archetypes/sector";
import { createFaction } from "@core/archetypes/faction";
import Color from "color";
import { createShip } from "@core/archetypes/ship";
import { shipClasses } from "@core/world/ships";
import { fromPolar } from "@core/utils/misc";
import settings from "@core/settings";
import { TacticalMap } from "@ui/components/TacticalMap/TacticalMap";
import { gameStore } from "@ui/state/game";
import { System } from "@core/systems/system";
import { defaultIndexer } from "@core/systems/utils/default";
import { Vec2 } from "ogl";

class MovingSystem extends System {
  apply(sim: Sim) {
    this.sim = sim;

    sim.hooks.phase.update.subscribe(this.constructor.name, () => {
      const shipsNum = defaultIndexer.ships.get().length;

      for (let i = 0; i < shipsNum; i++) {
        const ship = defaultIndexer.ships.get()[i];

        const angle = sim.getTime() * 1 + (i * Math.PI * 2) / shipsNum;
        const r = 0.1;

        const euclidean = fromPolar(angle, r);
        ship.cp.position.coord[0] = euclidean[0];
        ship.cp.position.coord[1] = euclidean[1];
        ship.cp.position.angle =
          ((angle + (2 * Math.PI) / shipsNum + Math.PI / 2) % (Math.PI * 2)) +
          Math.PI / 12;
      }
    });
  }
}

const Game: React.FC<{ fighters: number }> = ({ fighters }) => {
  const [sim, setSim] = React.useState<Sim | null>(null);
  React.useEffect(() => {
    settings.bootTime = 0;
    const xSim = new Sim({
      systems: [cooldownUpdatingSystem, attackingSystem, new MovingSystem()],
    });
    xSim.init();

    const sector = createSector(xSim, {
      position: [0, 0, 0],
      name: "Sector",
      slug: "sector",
    });
    gameStore.setSector(sector);

    for (let i = 0; i < fighters; i++) {
      const faction = createFaction(`Faction #${i + 1}`, xSim);
      faction.cp.color.value = Color.hsv((i / fighters) * 360, 100, 100)
        .rgb()
        .string();

      const fighter = createShip(xSim, {
        ...shipClasses.find(({ slug }) => slug === "dart")!,
        angle: 0,
        position: new Vec2(0, 0),
        owner: faction,
        sector,
      });
      fighter.cp.damage!.targetId =
        i === 0 ? fighter.id + fighters * 2 - 2 : fighter.id - 2;
    }

    xSim.start();
    setSim(xSim);

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        if (xSim.speed === 0) xSim.unpause();
        else xSim.pause();
      }
    });

    return () => {
      xSim.destroy();
    };
  }, [fighters]);

  if (!sim) return null;

  return <TacticalMap sim={sim} />;
};

const Template: StoryFn = ({ fighters }) => (
  <div id="root">
    <Styles>
      <Game fighters={fighters} />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  fighters: 3,
};

export default {
  title: "Scenarios / Shooting",
  parameters: {
    layout: "fullscreen",
  },
} as Meta;
