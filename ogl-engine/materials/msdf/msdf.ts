import type { Texture } from "ogl";
import { Vec3, Program } from "ogl";
import type { Engine } from "@ogl-engine/engine/engine";
import Color from "color";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { MaterialAny } from "../material";

export class MSDFMaterial extends MaterialAny {
  uniforms: MaterialAny["uniforms"] & {
    tMap: { value: Texture };
    uColor: { value: Vec3 };
  };

  constructor(engine: Engine, texture: Texture) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      cullFace: false,
      transparent: true,
    });
    this.uniforms.tMap = { value: texture };
    this.uniforms.uColor = { value: new Vec3(255) };
  }

  setColor(color: string) {
    const c = Color(color).rgb().array();
    this.uniforms.uColor.value.set(c[0], c[1], c[2]).divide(255);
  }
}
