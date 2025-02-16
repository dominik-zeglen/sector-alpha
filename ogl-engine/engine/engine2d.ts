import { Mesh, Plane, Program, Renderer } from "ogl";
import settings from "@core/settings";
import { gameStore } from "@ui/state/game";
import { Scene, StrategicMapScene } from "./Scene";
import { Camera } from "./Camera";
import { Engine } from "./engine";

// It's not really 2D, but it's going to be used as 2D
export class Engine2D extends Engine {
  init(canvas: HTMLCanvasElement | OffscreenCanvas) {
    if (this.initialized) {
      throw new Error("Engine already initialized");
    }

    this.canvas = canvas;
    this.renderer = new Renderer({
      canvas: canvas as any, // Works for both HTMLCanvasElement and OffscreenCanvas
      dpr: this.dpr,
      antialias: true,
    });
    this.camera = new Camera(this);
    this.camera.disablePane();
    this.camera.orthographic();
    this.camera.position.set(0, 50, 0);
    this.camera.lookAt([0, 0, 0]);
    this.camera.near = settings.camera.near;
    this.camera.far = settings.camera.far;

    this.hooks.onInit.notify();
    this.initialized = true;
  }

  render = () => {
    this.renderer.render({
      scene: this.scene,
      camera: this.camera,
    });
  };

  setScene = (scene: Scene) => {
    this.scene = scene;
  };

  // eslint-disable-next-line class-methods-use-this
  override isFocused(): boolean {
    return true;
  }
}

export class StrategicMapEngine extends Engine2D {
  canvas: HTMLCanvasElement;
  scene: StrategicMapScene;

  constructor() {
    super();

    this.scene = new StrategicMapScene(this);
  }

  setScene = (scene: StrategicMapScene) => {
    this.scene = scene;
  };

  // eslint-disable-next-line class-methods-use-this
  override isFocused(): boolean {
    return gameStore.overlay === "map";
  }
}

const vertex = /* glsl */ `#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position*2., 1.0);
}
`;

// Yes, I'm that lazy
export class TextureEngine extends Engine2D {
  canvas: OffscreenCanvas;
  size = 1024;
  plane: Mesh;

  uniforms: {
    uTime: { value: number };
    uSeed: { value: number };
  };

  constructor() {
    super();

    this.uniforms = {
      uTime: { value: 0 },
      uSeed: { value: 0 },
    };

    this.seed();
  }

  init(canvas: OffscreenCanvas) {
    super.init(canvas);

    this.dpr = this.size / 512;
    this.renderer.setSize(512, 512);

    this.setScene(new Scene(this));

    const plane = new Mesh(this.gl, {
      geometry: new Plane(this.gl),
    });
    plane.setParent(this.scene);
    this.plane = plane;
  }

  setShader(fragment: string) {
    this.plane.program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        uSeed: this.uniforms.uSeed,
        uTime: this.uniforms.uTime,
      },
    });
  }

  update(): void {
    super.update();
    this.uniforms.uTime.value += this.delta;
  }

  seed() {
    this.uniforms.uSeed.value = Math.random();
  }

  image(image: HTMLImageElement) {
    return this.canvas.convertToBlob().then((blob) => {
      image.src = URL.createObjectURL(blob!);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  override resize() {}
}
