import { add, matrix, multiply, subtract, sum } from "mathjs";
import { Vec2 } from "ogl";
import { sectorSize } from "../archetypes/sector";
import type { BaseComponent } from "./component";

export const transforms = {
  s: [0, 1, -1],
  se: [1, 0, -1],
  ne: [1, -1, 0],
  n: [0, -1, 1],
  nw: [-1, 0, 1],
  sw: [-1, 1, 0],
};

export type PositionAxial = [number, number];
export type PositionHex = [number, number, number];

export interface HECSPosition extends BaseComponent<"hecsPosition"> {
  /**
   * Cube coordinates as [q, r, s]
   * https://www.redblobgames.com/grids/hexagons/#coordinates-cube
   */
  value: PositionHex;
}

export function axialToCube(axial: PositionAxial): PositionHex {
  return [...axial, -axial[0] - axial[1]];
}

export function hecsMove(
  position: PositionHex,
  direction: keyof typeof transforms
): PositionHex {
  if (position.length !== 3) throw new Error("Invalid position");

  return add(position, transforms[direction]) as PositionHex;
}

export function hecsDistance(a: PositionHex, b: PositionHex): number {
  if (a.length !== 3 || b.length !== 3) throw new Error("Invalid position");

  return sum((subtract(a, b) as PositionHex).map(Math.abs)) / 2;
}

export function hecsRound(position: PositionHex): PositionHex {
  if (position.length !== 3) throw new Error("Invalid position");

  const rounded = position.map(Math.round) as PositionHex;
  const diff = subtract(position, rounded).map(Math.abs) as PositionHex;

  if (diff[0] > diff[1] && diff[0] > diff[2]) {
    rounded[0] = -rounded[1] - rounded[2];
  } else if (diff[1] > diff[2]) {
    rounded[1] = -rounded[0] - rounded[2];
  } else {
    rounded[2] = -rounded[0] - rounded[1];
  }

  return rounded;
}

export function hecsToCartesian(position: PositionHex, scale: number): Vec2 {
  if (position.length !== 3) throw new Error("Invalid position");

  return new Vec2(
    ...(multiply(
      multiply(
        matrix([
          [3 / 2, 0],
          [Math.sqrt(3) / 2, Math.sqrt(3)],
        ]),
        matrix(position).clone().resize([2])
      ),
      scale
    ).toArray() as number[])
  );
}

export function cartesianToHecs(position: Vec2, scale: number): PositionHex {
  return axialToCube(
    multiply(
      multiply(
        matrix([
          [2 / 3, 0],
          [-1 / 3, Math.sqrt(3) / 3],
        ]),
        matrix(position).clone().resize([2])
      ),
      scale
    ).toArray() as PositionAxial
  );
}

export function worldToHecs(coords: Vec2): PositionHex {
  return hecsRound(cartesianToHecs(coords, 10 / sectorSize));
}
