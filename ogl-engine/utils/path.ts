import type { Entity } from "@core/entity";
import type { RequireComponent } from "@core/tsHelpers";
import { findInAncestors } from "@core/utils/findInAncestors";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { ColorMaterial } from "@ogl-engine/materials/color/color";
import { gameStore } from "@ui/state/game";
import { Plane, Transform, Vec3 } from "ogl";

export type PathColor = "default" | "warning";
const colors: Record<PathColor, Vec3> = {
  default: new Vec3(169, 207, 252),
  warning: new Vec3(255, 0, 0),
};

export class Path extends Transform {
  engine: Engine3D;
  name = "Path";
  owner: Entity;

  constructor(engine: Engine3D, owner: Entity) {
    super();

    this.engine = engine;
    this.owner = owner;
  }

  createSegment = (): void => {
    const plane = new BaseMesh(this.engine, {
      geometry: new Plane(this.engine.gl),
      material: new ColorMaterial(this.engine, colors.default, false),
    });
    plane.rotation.x = -Math.PI / 2;
    plane.material.uniforms.fEmissive.value = 0.05;
    this.addChild(plane);
  };

  update = (waypoints: [Vec3, PathColor][]) => {
    for (let i = this.children.length; i < waypoints.length - 1; i++) {
      this.createSegment();
    }
    if (waypoints.length) {
      for (let i = waypoints.length - 1; i < this.children.length; i++) {
        this.removeChild(this.children[i]);
      }
    }

    for (let i = 0; i < waypoints.length - 1; i++) {
      const distance = waypoints[i][0].distance(waypoints[i + 1][0]);
      this.children[i].scale.set(
        (0.023 * this.engine.camera.position.y) / 5,
        distance,
        0
      );

      this.children[i].position.set(
        waypoints[i + 1][0].clone().add(waypoints[i][0]).divide(2)
      );
      this.children[i].rotation.y = Math.atan2(
        waypoints[i][0].x - waypoints[i + 1][0].x,
        waypoints[i][0].z - waypoints[i + 1][0].z
      );
      (
        this.children[i] as BaseMesh<ColorMaterial>
      ).material.uniforms.uColor.value = colors[waypoints[i + 1][1]];
    }
  };

  static getPath = (
    entity: RequireComponent<"position" | "orders">,
    scale: number
  ): [Vec3, PathColor][] => {
    const origin = findInAncestors(entity, "position");
    const waypoints: [Vec3, PathColor][] =
      origin.cp.position.sector === gameStore.sector.id
        ? [
            [
              new Vec3(
                origin.cp.position.coord[0] * scale,
                0,
                origin.cp.position.coord[1] * scale
              ),
              "default" as PathColor,
            ],
          ]
        : [];

    for (const order of entity.cp.orders.value) {
      for (const action of order.actions) {
        if (
          !(
            action.type === "dock" ||
            action.type === "teleport" ||
            action.type === "move" ||
            action.type === "attack"
          )
        )
          continue;

        const target = entity.sim.get(action.targetId);
        if (!target || target.cp.position!.sector !== gameStore.sector.id)
          continue;

        const targetWithPosition = findInAncestors(target!, "position");

        waypoints.push([
          new Vec3(
            targetWithPosition.cp.position.coord[0] * scale,
            0,
            targetWithPosition.cp.position.coord[1] * scale
          ),
          action.type === "attack" ? "warning" : "default",
        ]);
      }
    }

    return waypoints;
  };
}
