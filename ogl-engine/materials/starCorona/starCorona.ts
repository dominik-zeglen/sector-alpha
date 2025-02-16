import type { Vec3 } from "ogl";
import { Program } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import Color from "color";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class StarCoronaMaterial extends Material {
  uniforms: Material["uniforms"] & {
    uColor: { value: Vec3 };
  };

  constructor(engine: Engine3D, color: Vec3) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      transparent: true,
    });
    this.uniforms.uColor = { value: color };
  }

  setColor(color: string) {
    const c = Color(color).rgb().array();
    this.uniforms.uColor.value.set(c[0], c[1], c[2]).divide(255);
  }
}
