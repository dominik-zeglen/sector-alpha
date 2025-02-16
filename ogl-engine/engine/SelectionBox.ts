import { Vec2, Mat4, Plane, Vec3 } from "ogl";
import { SelectionBoxMaterial } from "@ogl-engine/materials/selectionBox/selectionBox";
import { filter, pipe, toArray } from "@fxts/core";
import { BaseMesh } from "./BaseMesh";
import type { Engine3D } from "./engine3d";
import type { TacticalMapScene } from "./Scene";

const tempVec3 = new Vec3();

export class SelectionBox extends BaseMesh<SelectionBoxMaterial> {
  frustumCulled = false;
  visible = false;

  constructor(engine: Engine3D) {
    super(engine, {
      geometry: new Plane(engine.gl),
    });
    this.applyMaterial(new SelectionBoxMaterial(engine));
  }

  updateGeometry(start: Vec2, end: Vec2) {
    const { position } = this.geometry.attributes;
    position.data!.set([
      start.x,
      start.y,
      0,

      end.x,
      start.y,
      0,

      start.x,
      end.y,
      0,

      end.x,
      end.y,
      0,
    ]);
    position.needsUpdate = true;

    this.material.uniforms.lineWidthX.value = 0.001 / Math.abs(start.x - end.x);
    this.material.uniforms.lineWidthY.value = 0.001 / Math.abs(start.y - end.y);
  }

  getEntitiesInSelection() {
    const projectionView = new Mat4()
      .copy(this.engine.camera.projectionMatrix)
      .multiply(this.engine.camera.viewMatrix);

    const vertexPositions = this.geometry.attributes.position.data!;

    const bounds = {
      start: new Vec2(
        Math.min(vertexPositions[0], vertexPositions[3]),
        Math.min(vertexPositions[1], vertexPositions[7])
      ),
      end: new Vec2(
        Math.max(vertexPositions[0], vertexPositions[3]),
        Math.max(vertexPositions[1], vertexPositions[7])
      ),
    };

    return pipe(
      (this.engine.scene as TacticalMapScene).entities.children,
      filter((entity) => entity.visible),
      filter((entity) => {
        const viewPos = tempVec3
          .copy(entity.position)
          .applyMatrix4(projectionView);

        return (
          viewPos.x >= bounds.start.x &&
          viewPos.x <= bounds.end.x &&
          viewPos.y >= bounds.start.y &&
          viewPos.y <= bounds.end.y
        );
      }),
      toArray
    );
  }
}
