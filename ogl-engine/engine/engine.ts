import { Observable } from "@core/utils/observer";
import { Renderer } from "ogl";
import type { Scene } from "./Scene";
import type { Camera } from "./Camera";

export abstract class Engine<TScene extends Scene = Scene> {
  public hooks: {
    onInit: Observable<void>;
    onUpdate: Observable<number>;
    onError: Observable<Error>;
  };

  public camera: Camera;
  protected canvas: HTMLCanvasElement | OffscreenCanvas;
  public initialized = false;
  public scene: TScene;

  protected renderer: Renderer;
  protected dpr = window.devicePixelRatio;
  protected lastFrameTime: number;

  public delta = 0;

  constructor() {
    this.hooks = {
      onInit: new Observable("onInit"),
      onUpdate: new Observable("onUpdate"),
      onError: new Observable("onError"),
    };
    this.lastFrameTime = performance.now();
  }

  abstract isFocused(): boolean;

  init(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    if (this.initialized) {
      throw new Error("Engine already initialized");
    }

    this.canvas = canvas;
    this.renderer = new Renderer({
      canvas: canvas as any, // Works for both HTMLCanvasElement and OffscreenCanvas
      dpr: this.dpr,
      antialias: true,
    });
  }

  resize(): void {
    if (!this.canvas || this.canvas instanceof OffscreenCanvas) return;

    const w = this.canvas!.parentElement!.clientWidth;
    const h = this.canvas!.parentElement!.clientHeight;

    this.renderer.setSize(w, h);
    this.camera.perspective({
      aspect: w / h,
    });
  }

  update(): void {
    if (!this.initialized) {
      throw new Error("Engine not initialized");
    }

    const now = performance.now();
    this.delta = (now - this.lastFrameTime) / 1000;
    this.hooks.onUpdate.notify(this.delta);

    try {
      if (this.isFocused()) {
        this.render();
      }
    } catch (err) {
      this.hooks.onError.notify(err);
      throw err;
    }

    this.lastFrameTime = now;
  }

  abstract render(): void;

  setScene(scene: TScene) {
    this.scene = scene;
  }

  get gl() {
    return this.renderer.gl;
  }
}
