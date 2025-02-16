import { sectorSize } from "@core/archetypes/sector";
import { ship } from "@core/archetypes/ship";
import type { Entity } from "@core/entity";
import settings from "@core/settings";
import type { RequireComponent } from "@core/tsHelpers";
import { first } from "@fxts/core";
import { random } from "mathjs";
import { Vec2 } from "ogl";

export function isOwnedByPlayer(entity: Entity): boolean {
  return entity!.cp.owner?.id === first(entity.sim.index.player.getIt())!.id;
}

export function getSubordinates(entity: RequireComponent<"subordinates">) {
  return entity.cp.subordinates.ids.map((id) =>
    ship(entity.sim.getOrThrow(id))
  );
}

export function getAngleDiff(
  origin: RequireComponent<"position">,
  path: Vec2
): number {
  const pathAngle = Math.atan2(path[1], path[0]);
  const dAngle = pathAngle - origin.cp.position.angle;

  return Math.atan2(Math.sin(dAngle), Math.cos(dAngle));
}

export function fromPolar(angle: number, distance: number): Vec2 {
  return new Vec2(distance * Math.cos(angle), distance * Math.sin(angle));
}

export function getRandomPositionInBounds(
  entity: RequireComponent<"position">,
  distance = 2
): Vec2 {
  let position: Vec2;

  do {
    position = fromPolar(random(0, 2 * Math.PI), random(0, distance)).add(
      entity.cp.position.coord
    );
  } while (position.len() > sectorSize);

  return position;
}

export const gameHour = 1;
export const gameDay = gameHour * 24;
export const gameMonth = gameDay * 30;
export const gameYear = gameMonth * 12;
export function getGameDate(timeOffset: number): string {
  const actual = timeOffset - settings.bootTime;
  return `${1 + (Math.floor(actual / gameDay) % 30)}.${
    1 + (Math.floor(actual / gameMonth) % 12)
  }.${2519 + (Math.floor(actual / gameYear) % 12)}`;
}

export function isVec2(v: object): v is { value: number[] } {
  return (v as any).isVec2 === true;
}
