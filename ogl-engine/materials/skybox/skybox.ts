import type { SkyboxTexture } from "@assets/textures/skybox";
import { skyboxes } from "@assets/textures/skybox";
import { Box, Mesh, Program, Texture } from "ogl";
import { Light } from "@ogl-engine/engine/Light";
import type { Destroyable } from "@ogl-engine/types";
import { pane } from "@ui/context/Pane";
import type { FolderApi } from "tweakpane";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import vertex from "./shader.vert.glsl";
import fragment from "./shader.frag.glsl";

const settings: Partial<
  Record<
    SkyboxTexture,
    {
      ambient: number;
      color: string;
      intensity: number;
      direction: [number, number, number];
    }
  >
> = {
  teegarden2: {
    ambient: 0.08,
    color: "#f2a0ae",
    intensity: 0.93,
    direction: [-1.7, -3.2, -7.6],
  },
  sectoralpha: {
    ambient: 0.15,
    color: "#fff6c5",
    intensity: 0.8,
    direction: [4.2, -1, 2.9],
  },
  example: {
    ambient: 0.02,
    color: "#d0bdff",
    intensity: 1.2,
    direction: [2.04, -3.04, 0.28],
  },
  earth: {
    ambient: 0.09,
    color: "#fffcdb",
    intensity: 0.75,
    direction: [0, -1, -0.4],
  },
  gaia: {
    ambient: 0.05,
    color: "#ebad7f",
    intensity: 0.39,
    direction: [0, -1, -0.4],
  },
};

export class Skybox extends Mesh implements Destroyable {
  private light: Light;
  name = "Skybox";
  engine: Engine3D;

  paneFolder: FolderApi;

  constructor(engine: Engine3D, name: keyof typeof skyboxes) {
    super(engine.gl, {
      geometry: new Box(engine.gl),
      program: new Program(engine.gl, {
        vertex,
        fragment,
        uniforms: {
          tMap: {
            value: new Texture(engine.gl, {
              target: engine.gl.TEXTURE_CUBE_MAP,
            }),
          },
          fCameraNear: { value: engine.camera.near },
          fCameraFar: { value: engine.camera.far },
        },
        cullFace: null,
      }),
      frustumCulled: false,
    });

    this.loadTexture(name);
    this.engine = engine;
    this.scale.set(1e3);
    this.light = new Light(0.5, true);
    this.light.position.set(0, -1, -0.4);
    this.light.setParent(this);
    this.engine.addLight(this.light);

    if (settings[name]) {
      this.loadConfig(name);
    }

    this.createPaneFolder();
  }

  loadConfig(name: keyof typeof settings) {
    this.light.setColor(settings[name]!.color);
    this.light.setIntensity(settings[name]!.intensity);
    this.light.position.set(...settings[name]!.direction);
    this.engine.uniforms.env.ambient.value
      .copy(this.light.uniforms.color.value)
      .multiply(settings[name]!.ambient);
  }

  loadTexture(texture: keyof typeof skyboxes) {
    this.program.uniforms.tMap.value.image = [
      skyboxes[texture].right,
      skyboxes[texture].left,
      skyboxes[texture].top,
      skyboxes[texture].bottom,
      skyboxes[texture].front,
      skyboxes[texture].back,
    ].map((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.program.uniforms.tMap.value.needsUpdate = true;
      };
      return img;
    });
  }

  createPaneFolder() {
    const existingFolder = pane.children.find(
      (child) => (child as FolderApi).title === "Skybox"
    );
    if (existingFolder) {
      existingFolder.dispose();
    }

    const params = {
      ambient: this.engine.uniforms.env.ambient.value[0],
      color: Color.rgb(
        ...this.light.uniforms.color.value.clone().multiply(255)
      ).hex(),
      direction: {
        x: this.light.position.x,
        y: this.light.position.y,
        z: this.light.position.z,
      },
      intensity: this.light.uniforms.intensity.value,
    };

    this.paneFolder = pane.addFolder({
      title: "Skybox",
    });

    this.paneFolder
      .addBinding(params, "ambient", {
        min: 0,
        max: 0.5,
      })
      .on("change", ({ value }) => {
        this.engine.uniforms.env.ambient.value.set(
          this.light.uniforms.color.value.clone().multiply(value)
        );
      });
    this.paneFolder
      .addBinding(params, "color", {
        view: "color",
      })
      .on("change", ({ value }) => {
        this.light.setColor(value);
      });
    this.paneFolder
      .addBinding(params, "intensity", {
        min: 0,
        max: 2,
      })
      .on("change", ({ value }) => {
        this.light.setIntensity(value);
      });
    this.paneFolder
      .addBinding(params, "direction")
      .on("change", ({ value }) => {
        this.light.position.set(value.x, value.y, value.z);
      });
  }

  destroy = () => {
    this.paneFolder?.dispose();
  };
}
