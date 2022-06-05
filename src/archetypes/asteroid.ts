import { Matrix } from "mathjs";
import Color from "color";
import { Entity } from "../components/entity";
import { Minable } from "../components/minable";
import { Parent } from "../components/parent";
import { Position } from "../components/position";
import { Render } from "../components/render";
import { MineableCommodity } from "../economy/commodity";
import { Sim } from "../sim";
import { RequireComponent } from "../tsHelpers";
import asteroidTexture from "../../assets/asteroid.svg";
import { AsteroidField } from "./asteroidField";

export const asteroidComponents = [
  "minable",
  "parent",
  "position",
  "render",
] as const;

// Ugly hack to transform asteroidComponents array type to string union
const widenType = [...asteroidComponents][0];
export type AsteroidComponent = typeof widenType;
export type Asteroid = RequireComponent<AsteroidComponent>;

export const fieldColors: Record<MineableCommodity, string> = {
  fuelium: "#ffab6b",
  goldOre: "#ffe46b",
  ice: "#e8ffff",
  ore: "#ff5c7a",
  silica: "#8f8f8f",
};

export function asteroid(entity: Entity): Asteroid {
  return entity.requireComponents(asteroidComponents);
}

export function createAsteroid(
  sim: Sim,
  parent: AsteroidField,
  position: Matrix
) {
  const entity = new Entity(sim);
  const type = parent.cp.asteroidSpawn.type;

  entity.addComponent("minable", new Minable(type));
  entity.addComponent("parent", new Parent(parent));
  entity.addComponent("position", new Position(position, 0));
  entity.addComponent(
    "render",
    new Render({
      color: Color(fieldColors[type]).rgbNumber(),
      defaultScale: 0.6,
      maxZ: 1.2,
      pathToTexture: asteroidTexture,
      zIndex: 0,
    })
  );

  parent.components.children.add(entity as RequireComponent<"parent">);

  return asteroid(entity);
}
