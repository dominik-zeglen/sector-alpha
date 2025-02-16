import type { GLTFMaterial, Texture } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class SimplePbrMaterial extends Material {
  uniforms: Material["uniforms"] & {
    tDiffuse: { value: Texture };
    tNormal: { value: Texture };
    tRoughness: { value: Texture };
    uShininess: { value: number };
    tEmissive: { value: Texture };
    uNormalScale: { value: number };
    uNormalUVScale: { value: number };
  };

  constructor(engine: Engine3D, gltfMaterial: GLTFMaterial) {
    super(engine);

    const defines: Record<string, string> = {};

    this.uniforms.tDiffuse = { value: gltfMaterial.baseColorTexture.texture };
    this.uniforms.tNormal = { value: gltfMaterial.normalTexture.texture };

    if (gltfMaterial.metallicRoughnessTexture) {
      this.uniforms.tRoughness = {
        value: gltfMaterial.metallicRoughnessTexture.texture,
      };
      defines.USE_ROUGHNESS = "1";
    } else {
      this.uniforms.uShininess = { value: gltfMaterial.roughnessFactor };
    }

    if (gltfMaterial.emissiveTexture) {
      this.uniforms.tEmissive = {
        value: gltfMaterial.emissiveTexture.texture,
      };
      defines.USE_EMISSIVE = "1";
    }

    this.createProgram(vertex, fragment, defines);
  }
}
