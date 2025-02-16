import type { Material } from "@ogl-engine/materials/material";
import type { Geometry, GLTF, MeshOptions } from "ogl";
import { Mesh, Vec3 } from "ogl";
import { MissingMaterial } from "@ogl-engine/materials/missing/missing";
import type { Destroyable } from "@ogl-engine/types";
import type { Engine3D } from "./engine3d";
import { Light } from "./Light";

export class BaseMesh<TMaterial extends Material = Material>
  extends Mesh
  implements Destroyable
{
  engine: Engine3D;
  name = "BaseMesh";
  material: TMaterial;
  onDestroyCallbacks: (() => void)[] = [];

  constructor(
    engine: Engine3D,
    options: Partial<
      MeshOptions & {
        material: TMaterial;
        name: string;
        calculateTangents: boolean;
      }
    >
  ) {
    super(engine.gl, options);

    if (options.name) {
      this.name = options.name;
    }

    if (this.geometry && !this.geometry.attributes.tangent) {
      this.calculateTangents();
    }

    this.engine = engine;
    this.applyMaterial(
      options.material ?? (new MissingMaterial(engine) as any)
    );
  }

  applyMaterial(material: TMaterial): BaseMesh<TMaterial> {
    this.material = material;
    this.material.apply(this);

    return this;
  }

  applyGeometry(geometry: Geometry): void {
    this.geometry = geometry;

    // add tangent attribute if missing
    if (!this.geometry.attributes.tangent) {
      this.calculateTangents();
    }
  }

  setVisibility(visible: boolean): void {
    this.visible = visible;

    this.traverse((child) => {
      if (child instanceof Light) {
        child.setVisibility(visible);
      }
    });
  }

  private calculateTangents(): void {
    const vertices = this.geometry.attributes.position.data!;
    const indices = this.geometry.attributes.index.data!;
    const uvs = this.geometry.attributes.uv.data!;

    const tangents = new Float32Array(vertices.length);
    let degenerateUVs = 0;

    // calculate tangents and bitangents
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const pos1 = new Vec3(...vertices.slice(i0 * 3, i0 * 3 + 3));
      const pos2 = new Vec3(...vertices.slice(i1 * 3, i1 * 3 + 3));
      const pos3 = new Vec3(...vertices.slice(i2 * 3, i2 * 3 + 3));

      const edge1 = pos2.clone().sub(pos1);
      const edge2 = pos3.clone().sub(pos1);

      const uv1 = new Vec3(...uvs.slice(i0 * 2, i0 * 2 + 2));
      const uv2 = new Vec3(...uvs.slice(i1 * 2, i1 * 2 + 2));
      const uv3 = new Vec3(...uvs.slice(i2 * 2, i2 * 2 + 2));

      const deltaUV1 = uv2.clone().sub(uv1);
      const deltaUV2 = uv3.clone().sub(uv1);

      const f = 1 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);

      const tangent = new Vec3(
        f * (deltaUV2.y * edge1.x - deltaUV1.y * edge2.x),
        f * (deltaUV2.y * edge1.y - deltaUV1.y * edge2.y),
        f * (deltaUV2.y * edge1.z - deltaUV1.y * edge2.z)
      );

      tangents[i0 * 3 + 0] += tangent.x;
      tangents[i0 * 3 + 1] += tangent.y;
      tangents[i0 * 3 + 2] += tangent.z;

      tangents[i1 * 3 + 0] += tangent.x;
      tangents[i1 * 3 + 1] += tangent.y;
      tangents[i1 * 3 + 2] += tangent.z;

      tangents[i2 * 3 + 0] += tangent.x;
      tangents[i2 * 3 + 1] += tangent.y;
      tangents[i2 * 3 + 2] += tangent.z;

      if (
        deltaUV1.x === 0 &&
        deltaUV1.y === 0 &&
        deltaUV2.x === 0 &&
        deltaUV2.y === 0
      ) {
        degenerateUVs++;
      }
    }

    if (degenerateUVs > 0) {
      // eslint-disable-next-line no-console
      console.warn(`BaseMesh: ${degenerateUVs} faces have degenerate UVs`);
    }

    this.geometry.addAttribute("tangent", {
      size: 3,
      data: tangents,
    });
  }

  // eslint-disable-next-line no-shadow
  static fromGltf<TMaterial extends Material>(
    engine: Engine3D,
    gltf: GLTF,
    options?: Partial<MeshOptions & { material: TMaterial }>
  ): BaseMesh<TMaterial> {
    const mesh = new BaseMesh<TMaterial>(engine, {
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
