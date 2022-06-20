import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import Color from "color";
import { System } from "../system";
import { drawGraphics } from "../../components/renderGraphics";
import { RequireComponent } from "../../tsHelpers";

const minScale = 0.13;

export class RenderingSystem extends System {
  selectionManger: RequireComponent<"selectionManager">;
  viewport: Viewport;
  prevScale: number = minScale;
  app: PIXI.Application;
  initialized = false;
  resizeObserver: ResizeObserver;

  init = () => {
    this.selectionManger = this.sim.queries.selectionManager.get()[0];
    const root = document.querySelector("#root")!;
    const toolbar = document.querySelector("#toolbar")!;
    const canvasRoot = document.querySelector(
      "#canvasRoot"
    )! as HTMLCanvasElement;

    if (!(root || toolbar || canvasRoot)) return;

    const canvas = document.createElement("canvas");
    canvasRoot.appendChild(canvas);

    this.app = new PIXI.Application({
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      width: root.clientWidth - toolbar.clientWidth,
      height: window.innerHeight,
      view: canvas,
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.app.resizeTo = canvasRoot;
    });
    this.resizeObserver.observe(toolbar);

    const viewport = new Viewport({
      screenWidth: root.clientWidth - toolbar.clientWidth,
      screenHeight: window.innerHeight,
      interaction: this.app.renderer.plugins.interaction,
    });

    this.app.stage.addChild(viewport);

    viewport.drag().pinch().wheel();
    viewport.clampZoom({ minScale });
    viewport.on("drag-start", () => {
      this.selectionManger.cp.selectionManager.focused = false;
      viewport.plugins.remove("follow");
    });
    viewport.sortableChildren = true;

    this.viewport = viewport;
    this.initialized = true;
  };

  destroy(): void {
    this.viewport.destroy();
    this.app.destroy(true);
  }

  exec(): void {
    if (!this.initialized) {
      this.init();
      return;
    }
    this.selectionManger = this.sim.queries.selectionManager.get()[0];

    this.sim.queries.sectors.get().forEach((sector) => {
      if (!sector.cp.renderGraphics.initialized) {
        drawGraphics(sector.cp.renderGraphics, this.viewport);
        sector.cp.renderGraphics.initialized = true;
      }
    });

    this.sim.queries.renderableGraphics.get().forEach((entity) => {
      if (!entity.cp.renderGraphics.initialized) {
        drawGraphics(entity.cp.renderGraphics, this.viewport);
        entity.cp.renderGraphics.initialized = true;
      }
    });

    this.sim.queries.renderable.get().forEach((entity) => {
      const entityRender = entity.cp.render;
      const selected =
        entity.id === this.selectionManger.cp.selectionManager.id;

      if (!entityRender.initialized) {
        this.viewport.addChild(entityRender.sprite);
        if (entity.hasComponents(["selection"])) {
          entityRender.sprite.interactive = true;
          entityRender.sprite.on("mousedown", () => {
            this.selectionManger.cp.selectionManager.id = entity.id;
          });
          entityRender.sprite.cursor = "pointer";
        }

        entityRender.initialized = true;
      }

      entityRender.sprite.position.set(
        entity.cp.position.coord.get([0]) * 10,
        entity.cp.position.coord.get([1]) * 10
      );
      entityRender.sprite.rotation = entity.cp.position.angle;
      if (selected && entityRender.sprite.tint === entityRender.color) {
        entityRender.sprite.tint = Color(entityRender.sprite.tint)
          .lighten(0.23)
          .rgbNumber();
        entityRender.sprite.zIndex = 10;
      } else if (!selected && entityRender.sprite.tint !== entityRender.color) {
        entityRender.sprite.tint = entityRender.color;
        entityRender.sprite.zIndex = entityRender.zIndex;
      }

      entityRender.sprite.scale.set(
        (1 / this.prevScale) * entityRender.defaultScale * (selected ? 1.5 : 1)
      );

      entityRender.sprite.visible = entityRender.maxZ <= this.prevScale;
    });

    if (this.selectionManger.cp.selectionManager.focused) {
      this.viewport.follow(
        this.sim
          .getOrThrow(this.selectionManger.cp.selectionManager.id!)
          .requireComponents(["render"]).cp.render.sprite
      );
    }

    this.prevScale = this.viewport.scale.x;
  }
}
