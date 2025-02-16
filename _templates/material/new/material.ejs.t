---
to: ogl-engine/materials/<%= name %>/<%= name %>.ts
---

import { Program } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class <%= h.capitalize(name) %>Material extends Material {
  uniforms: Material["uniforms"] & {
    
  };

  constructor(engine: Engine3D) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
    });

    this.uniforms.
  }
}
