import { random } from "mathjs";
import { MineableCommodity } from "../economy/commodity";
import { Sim } from "../sim";
import { pickRandom } from "../utils/generators";
import { getRandomAsteroidField, spawnAsteroidField } from "./asteroids";
import { createConnections } from "./connections";
import { createFactions } from "./factions";
import { createIslands } from "./islands";

function getRandomWorld(
  sim: Sim,
  numberOfIslands: number,
  numberOfFactions: number
): Promise<void> {
  return new Promise((resolve) => {
    requestIdleCallback(() => {
      const islands = createIslands(sim, numberOfIslands);
      createConnections(sim, islands);

      const sectors = sim.queries.sectors.get();
      Array(sectors.length).fill(0).map(getRandomAsteroidField);

      createFactions(sim, islands.slice(1), numberOfFactions);
      sim.queries.ai
        .get()
        .filter((faction) => faction.cp.ai.type === "territorial")
        .forEach((faction) =>
          ["ice", "fuelium"].forEach((commodity: MineableCommodity) => {
            const ownedSectors = sectors.filter(
              (sector) => sector.cp.owner?.id === faction.id
            );

            spawnAsteroidField(
              commodity,
              random(
                7 + Math.sqrt(ownedSectors.length),
                9 + Math.sqrt(ownedSectors.length)
              ),
              pickRandom(ownedSectors)
            );
          })
        );

      resolve();
    });
  });
}

export default getRandomWorld;
