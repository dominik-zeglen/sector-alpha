import { Program, Texture } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import type { TextureName } from "@ogl-engine/AssetLoader";
import { assetLoader } from "@ogl-engine/AssetLoader";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class AsteroidDustMaterial extends Material {
  uniforms: Material["uniforms"] & {
    tMap: { value: Texture };
  };

  constructor(engine: Engine3D, texture: TextureName) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      transparent: true,
      cullFace: null,
    });

    const tMap = new Texture(engine.gl, {
      image: assetLoader.getTexture(texture),
      generateMipmaps: false,
    });
    this.uniforms.tMap = { value: tMap };
  }
}
