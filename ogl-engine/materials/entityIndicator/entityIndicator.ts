import { Program, Vec4 } from "ogl";
import type { Engine } from "@ogl-engine/engine/engine";
import Color from "color";
import type { DockSize } from "@core/components/dockable";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class EntityIndicatorMaterial extends Material {
  uniforms: Material["uniforms"] & {
    uSize: { value: number };
    uColor: { value: Vec4 };
  };

  constructor(engine: Engine) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      depthTest: false,
      transparent: true,
    });
    this.uniforms.uColor = { value: new Vec4(1) };
    this.uniforms.uSize = { value: 1 };
  }

  setColor(color: number) {
    const c = Color(color).array();
    this.uniforms.uColor.value.set(c[0], c[1], c[2], 255).multiply(1 / 255);
  }

  setSize(size: DockSize) {
    this.uniforms.uSize.value = {
      small: 1,
      medium: 2,
      large: 4,
    }[size];
  }
}
