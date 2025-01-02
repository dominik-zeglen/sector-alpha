import type { Texture } from "ogl";
import { Vec3, Program, TextureLoader } from "ogl";
import smoke from "@assets/textures/smoke.jpg";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import fragment from "./shader.frag.glsl";
import vertex from "./shader.vert.glsl";
import { Material } from "../material";

export class StarMaterial extends Material {
  uniforms: Material["uniforms"] & {
    vColor: { value: Vec3 };
    tSmoke: { value: Texture };
    uNoise: { value: number };
    uNoisePower: { value: number };
  };

  constructor(engine: Engine3D) {
    super(engine);

    const tSmoke = TextureLoader.load(engine.gl, {
      src: {
        jpg: smoke,
      },
      wrapS: engine.gl.REPEAT,
      wrapT: engine.gl.REPEAT,
    });

    this.program = new Program(engine.gl, {
      vertex,
      fragment,
      uniforms: this.uniforms,
    });
    this.uniforms.tSmoke = { value: tSmoke };
    this.uniforms.vColor = { value: new Vec3() };
    this.uniforms.uNoise = { value: 1 };
    this.uniforms.uNoisePower = { value: 1 };
  }

  setColor(color: string) {
    Material.colorToVec3(color, this.uniforms.vColor);
  }
}
