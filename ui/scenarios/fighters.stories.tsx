import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { Sim } from "@core/sim";
import { movingSystem } from "@core/systems/moving";
import { spottingSystem } from "@core/systems/ai/spotting";
import { hitpointsRegeneratingSystem } from "@core/systems/hitpointsRegenerating";
import { navigatingSystem } from "@core/systems/navigating";
import { cooldownUpdatingSystem } from "@core/systems/cooldowns";
import { orderPlanningSystem } from "@core/systems/ai/orderPlanning";
import { orderExecutingSystem } from "@core/systems/orderExecuting/orderExecuting";
import { attackingSystem } from "@core/systems/attacking";
import { deadUnregisteringSystem } from "@core/systems/deadUnregistering";
import { pathPlanningSystem } from "@core/systems/pathPlanning";
import { createSector } from "@core/archetypes/sector";
import type { Faction } from "@core/archetypes/faction";
import { createFaction } from "@core/archetypes/faction";
import Color from "color";
import { createShip } from "@core/archetypes/ship";
import { shipClasses } from "@core/world/ships";
import { random } from "mathjs";
import { pickRandom } from "@core/utils/generators";
import { moveToActions } from "@core/utils/moving";
import { createWaypoint } from "@core/archetypes/waypoint";
import { fromPolar } from "@core/utils/misc";
import {
  changeRelations,
  relationThresholds,
} from "@core/components/relations";
import settings from "@core/settings";
import { TacticalMap } from "@ui/components/TacticalMap/TacticalMap";
import { gameStore } from "@ui/state/game";
import { Vec2 } from "ogl";

const Game: React.FC<{ factions: number; fighters: number }> = ({
  factions,
  fighters,
}) => {
  const [sim, setSim] = React.useState<Sim | null>(null);
  React.useEffect(() => {
    settings.bootTime = 0;
    const xSim = new Sim({
      systems: [
        pathPlanningSystem,
        movingSystem,
        spottingSystem,
        hitpointsRegeneratingSystem,
        navigatingSystem,
        cooldownUpdatingSystem,
        orderPlanningSystem,
        orderExecutingSystem,
        attackingSystem,
        deadUnregisteringSystem,
      ],
    });
    xSim.init();

    document.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        if (xSim.speed > 0) {
          xSim.pause();
        } else {
          xSim.setSpeed(xSim.prevSpeed);
        }
      }
    });

    const sector = createSector(xSim, {
      position: [0, 0, 0],
      name: "Sector",
      slug: "sector",
    });
    gameStore.setSector(sector);

    const generatedFactions: Faction[] = [];
    for (let i = 0; i < factions; i++) {
      const faction = createFaction(`Faction #${i + 1}`, xSim);
      faction.cp.color.value = Color.hsv((i / factions) * 360, 100, 100)
        .rgb()
        .string();
      faction.cp.policies.enemySpotted.military = "attack";
      generatedFactions.push(faction);

      for (let j = 0; j < fighters; j++) {
        const fighter = createShip(xSim, {
          ...pickRandom(shipClasses.filter(({ slug }) => slug === "dart")),
          angle: random(-Math.PI, Math.PI),
          position: fromPolar(
            (2 * Math.PI * (i * fighters + j)) / (factions * fighters),
            random(4, 6)
          ),
          owner: faction,
          sector,
        });
        fighter.cp.orders.value = [
          {
            type: "move",
            actions: moveToActions(
              fighter,
              createWaypoint(xSim, {
                value: new Vec2(0, 0),
                sector: sector.id,
                owner: faction.id,
              }),
              {}
            ),
            origin: "manual",
          },
        ];
      }
    }
    for (const factionA of generatedFactions) {
      for (const factionB of generatedFactions) {
        if (factionA === factionB) continue;
        changeRelations(factionA, factionB, relationThresholds.attack - 1);
      }
    }

    xSim.start();
    setSim(xSim);

    return () => {
      xSim.destroy();
    };
  }, [factions, fighters]);

  if (!sim) return null;

  return <TacticalMap sim={sim} />;
};

const Template: StoryFn = ({ factions, fighters }) => (
  <div id="root">
    <Styles>
      <Game factions={factions} fighters={fighters} />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  factions: 3,
  fighters: 2,
};

export default {
  title: "Scenarios / Fighters",
  parameters: {
    layout: "fullscreen",
  },
} as Meta;
