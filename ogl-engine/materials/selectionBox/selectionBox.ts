import { Program } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { Material } from "../material";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";

export class SelectionBoxMaterial extends Material {
  uniforms: Material["uniforms"] & {
    lineWidthX: { value: number };
    lineWidthY: { value: number };
  };

  constructor(engine: Engine3D) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
      cullFace: null,
    });
    this.uniforms.lineWidthX = { value: 0.1 };
    this.uniforms.lineWidthY = { value: 0.1 };
  }
}
