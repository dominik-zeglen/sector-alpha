import { Vec2 } from "ogl";
import type { PositionHex } from "./hecsPosition";
import { hecsDistance, worldToHecs } from "./hecsPosition";

describe("worldToHecs", () => {
  const testCases: [Vec2, PositionHex][] = [
    [new Vec2(0, 0), [0, 0, 0]],
    [new Vec2(90, -55), [1, -1, 0]],
    [new Vec2(78, -162), [1, -2, 1]],
  ];

  test.each(testCases)(
    "should convert world coordinates to hex coordinates",
    (position, expected) => {
      expect(hecsDistance(expected, worldToHecs(position))).toEqual(0);
    }
  );
});
