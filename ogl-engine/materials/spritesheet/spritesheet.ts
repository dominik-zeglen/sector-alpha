import type { Texture } from "ogl";
import { Program, Vec4 } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { Material } from "../material";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";

export class SpritesheetMaterial extends Material {
  uniforms: Material["uniforms"] & {
    tDiffuse: { value: Texture };
    sprite: { value: Vec4 };
    fAlpha: { value: number };
    fEmissive: { value: number };
  };
  index: number;

  constructor(
    engine: Engine3D,
    spritesheet: Texture,
    size: number,
    index: number
  ) {
    super(engine);

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: this.uniforms,
    });
    this.uniforms.fAlpha = { value: 1 };
    this.uniforms.fEmissive = { value: 1 };
    this.setSprite(spritesheet, size, index);
  }

  setSprite(spritesheet: Texture, size: number, index: number) {
    this.uniforms.tDiffuse = { value: spritesheet };
    this.setIndex(size, index);
  }

  setIndex(size: number, index: number) {
    this.index = index;
    const x = index % size;
    const y = Math.floor(index / size);
    this.uniforms.sprite = {
      value: new Vec4(x / size, y / size, 1 / size, 1 / size),
    };
  }
}
