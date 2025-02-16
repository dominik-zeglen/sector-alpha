import type { Texture } from "ogl";
import { Vec3, Program } from "ogl";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class TintedTextureMaterial extends Material {
  uniforms: Material["uniforms"] & {
    tMap: { value: Texture };
    uColor: { value: Vec3 };
    fEmissive: { value: number };
  };

  constructor(engine: Engine3D, texture: Texture, color?: string) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      transparent: true,
    });
    this.uniforms.tMap = { value: texture };
    this.uniforms.uColor = {
      value: color
        ? new Vec3(...Color(color).array()).divide(255)
        : new Vec3(1, 1, 1),
    };
    this.uniforms.fEmissive = { value: 0.1 };
  }
}
