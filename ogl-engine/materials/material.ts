import settings from "@core/settings";
import type { Engine } from "@ogl-engine/engine/engine";
import type { Engine2D } from "@ogl-engine/engine/engine2d";
import { entries, join, map, pipe } from "@fxts/core";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import type { Light } from "@ogl-engine/engine/Light";
import Color from "color";
import { type Vec3, type Mesh, Program, Texture } from "ogl";
import type { FolderApi } from "tweakpane";

export abstract class Material {
  engine: Engine3D;
  protected program: Program;
  protected uniforms: {
    ambient: { value: Vec3 };
    lights: Light["uniforms"][];
    uTime: { value: number };
    fCameraNear: { value: number };
    fCameraFar: { value: number };
  };

  constructor(engine: Engine3D) {
    this.engine = engine;
    this.uniforms = {
      ambient: engine.uniforms.env.ambient,
      lights: engine.uniforms.env.lights,
      uTime: engine.uniforms.uTime,
      fCameraNear: { value: settings.camera.near },
      fCameraFar: { value: settings.camera.far },
    };
  }

  apply(mesh: Mesh) {
    mesh.program = this.program;
  }

  createPaneSettings(folder: FolderApi) {
    for (const uniform of Object.keys(this.uniforms)) {
      if (
        ["ambient", "lights", "uTime", "fCameraNear", "fCameraFar"].includes(
          uniform
        )
      )
        continue;

      if (this.uniforms[uniform].value instanceof Texture) continue;

      if (uniform.match(/[cC]olor/)) {
        const color = Color.rgb(
          this.uniforms[uniform].value.toArray().map((v) => v * 255)
        ).hex();
        folder
          .addBinding({ color }, "color", {
            label: uniform,
            view: "color",
          })
          .on("change", ({ value }) => {
            Material.colorToVec3(value, this.uniforms[uniform]);
          });
      } else {
        folder.addBinding(this.uniforms[uniform], "value", {
          label: uniform,
          view: uniform.match(/[cC]olor/) ? "color" : undefined,
        });
      }
    }
  }

  createProgram(
    vertex: string,
    fragment: string,
    defines: Record<string, string> = {}
  ) {
    this.program = new Program(this.engine.gl, {
      vertex: vertex.replace(
        /#pragma defines/g,
        pipe(
          defines,
          entries,
          map(([key, value]) => `#define ${key} ${value}`),
          join("\n")
        )
      ),
      fragment: fragment.replace(
        /#pragma defines/g,
        pipe(
          defines,
          entries,
          map(([key, value]) => `#define ${key} ${value}`),
          join("\n")
        )
      ),
      uniforms: this.uniforms,
    });
  }

  static colorToVec3(color: string, uniform: { value: Vec3 }) {
    const c = Color(color).rgb().array();
    uniform.value.set(c[0], c[1], c[2]).divide(255);
  }
}

export abstract class Material2D {
  engine: Engine2D;
  protected program: Program;
  protected uniforms: {
    fCameraNear: { value: number };
    fCameraFar: { value: number };
  };

  constructor(engine: Engine2D) {
    this.engine = engine;
    this.uniforms = {
      fCameraNear: { value: settings.camera.near },
      fCameraFar: { value: settings.camera.far },
    };
  }

  apply(mesh: Mesh) {
    mesh.program = this.program;
  }
}

export abstract class MaterialAny {
  engine: Engine;
  protected program: Program;
  protected uniforms: {};

  constructor(engine: Engine) {
    this.engine = engine;
    this.uniforms = {};
  }

  apply(mesh: Mesh) {
    mesh.program = this.program;
  }
}
