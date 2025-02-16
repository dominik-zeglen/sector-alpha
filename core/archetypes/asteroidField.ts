import { randomInt, random } from "mathjs";
import type { Vec2 } from "ogl";
import { fromPolar } from "@core/utils/misc";
import type { AsteroidSpawn } from "../components/asteroidSpawn";
import { Entity } from "../entity";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import type { Sector } from "./sector";
import { createAsteroid } from "./asteroid";

export const asteroidFieldComponents = [
  "asteroidSpawn",
  "children",
  "position",
] as const;

export type AsteroidFieldComponent = (typeof asteroidFieldComponents)[number];
export type AsteroidField = RequireComponent<AsteroidFieldComponent>;

export function asteroidField(entity: Entity): AsteroidField {
  return entity.requireComponents(asteroidFieldComponents);
}

export function getFieldMax(
  asteroidSpawn: Pick<AsteroidSpawn, "size" | "density">
): number {
  return asteroidSpawn.size ** 2 * asteroidSpawn.density;
}

export function spawn(field: AsteroidField) {
  const sim = field.sim;
  const asteroidAngle = Math.random() * Math.PI;
  const asteroidDistance = random(-1, 1) * field.cp.asteroidSpawn.size;
  const amount = Math.max(
    field.cp.asteroidSpawn.amount,
    randomInt(
      field.cp.asteroidSpawn.asteroidResources.min,
      field.cp.asteroidSpawn.asteroidResources.max
    )
  );

  field.cp.asteroidSpawn.amount -= amount;
  const asteroid = createAsteroid(
    sim,
    field,
    fromPolar(asteroidAngle, asteroidDistance).add(field.cp.position.coord),
    amount
  );
  field.cp.children.entities.push(asteroid.id);

  return asteroid;
}

export function createAsteroidField(
  sim: Sim,
  position: Vec2,
  sector: Sector,
  data: Omit<AsteroidSpawn, "name" | "amount">
) {
  const entity = new Entity(sim);

  entity
    .addComponent({
      name: "asteroidSpawn",
      ...data,
      amount: getFieldMax(data) * random(0.8, 1),
    })
    .addComponent({ name: "children", entities: [] })
    .addComponent({
      name: "position",
      coord: position,
      angle: 0,
      sector: sector.id,
      moved: false,
    });

  return asteroidField(entity);
}
