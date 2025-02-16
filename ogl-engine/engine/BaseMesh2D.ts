import type { Material2D, MaterialAny } from "@ogl-engine/materials/material";
import type { GLTF, MeshOptions } from "ogl";
import { Mesh } from "ogl";
import type { Destroyable } from "@ogl-engine/types";
import { ColorMaterial2D } from "@ogl-engine/materials/color/color";
import type { Engine2D } from "./engine2d";

export class BaseMesh2D<TMaterial extends Material2D | MaterialAny = Material2D>
  extends Mesh
  implements Destroyable
{
  engine: Engine2D;
  name = "BaseMesh";
  material: TMaterial;
  onDestroyCallbacks: (() => void)[] = [];

  constructor(
    engine: Engine2D,
    options: Partial<MeshOptions & { material: TMaterial; name: string }>
  ) {
    super(engine.gl, options);

    if (options.name) {
      this.name = options.name;
    }

    this.engine = engine;
    this.applyMaterial(
      options.material ?? (new ColorMaterial2D(engine, "#ff00ff") as any)
    );
  }

  applyMaterial(material: TMaterial): BaseMesh2D<TMaterial> {
    this.material = material;
    this.material.apply(this);

    return this;
  }

  // eslint-disable-next-line no-shadow
  static fromGltf<TMaterial extends Material2D>(
    engine: Engine2D,
    gltf: GLTF,
    options?: Partial<MeshOptions & { material: TMaterial }>
  ): BaseMesh2D<TMaterial> {
    const mesh = new BaseMesh2D<TMaterial>(engine, {
      ...options,
      geometry: gltf.meshes[0].primitives[0].geometry,
      material: options?.material,
    });

    return mesh;
  }

  destroy() {
    for (const cb of this.onDestroyCallbacks) {
      cb();
    }
  }
}
