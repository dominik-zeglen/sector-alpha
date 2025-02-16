import { Vec3, Program } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import Color from "color";
import type { Engine2D } from "@ogl-engine/engine/engine2d";
import fragment from "./shader.frag.glsl";
import fragment2d from "./shader2d.frag.glsl";
import vertex from "./shader.vert.glsl";
import vertex2d from "./shader2d.vert.glsl";
import { Material, Material2D } from "../material";

export class ColorMaterial extends Material {
  uniforms: Material["uniforms"] & {
    uColor: { value: Vec3 };
    fEmissive: { value: number };
    bShaded: { value: boolean };
  };

  constructor(engine: Engine3D, color: Vec3, shaded = true) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
    });
    this.uniforms.uColor = { value: color };
    this.uniforms.fEmissive = { value: 0 };
    this.uniforms.bShaded = { value: shaded };
  }

  setColor(color: Vec3) {
    this.uniforms.uColor.value = color;
  }

  getColor(): Vec3 {
    return this.uniforms.uColor.value;
  }
}

export class ColorMaterial2D extends Material2D {
  uniforms: Material["uniforms"] & {
    uColor: { value: Vec3 };
  };

  constructor(engine: Engine2D, color: string) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex: vertex2d,
      fragment: fragment2d,
      uniforms: this.uniforms,
      cullFace: false,
    });
    this.uniforms.uColor = { value: new Vec3() };

    this.setColor(color);
  }

  setColor(color: string) {
    const c = Color(color).rgb().array();
    this.uniforms.uColor.value.set(c[0], c[1], c[2]).divide(255);
  }
}
