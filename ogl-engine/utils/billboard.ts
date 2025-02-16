import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import type { Material } from "@ogl-engine/materials/material";
import type { Vec3 } from "ogl";
import { Plane } from "ogl";

export class Billboard<
  TMaterial extends Material = Material
> extends BaseMesh<TMaterial> {
  originalScale: Vec3;
  scaling = false;

  constructor(engine: Engine3D) {
    super(engine, {
      geometry: new Plane(engine.gl),
    });

    this.onBeforeRender(this.update);
  }

  update = () => {
    this.lookAt(this.engine.camera.position);

    if (this.scaling) {
      this.scale
        .set(this.engine.camera.position.distance(this.position))
        .multiply(this.originalScale);
    }
  };

  setScaling = (scaling: boolean) => {
    this.scaling = scaling;
    if (scaling) {
      this.originalScale.set(this.scale);
    } else {
      this.scale.set(this.originalScale);
    }
  };
}
