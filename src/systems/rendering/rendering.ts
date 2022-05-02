import P5 from "p5";
import "./components/Panel";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import Color from "color";
import { Sim } from "../../sim";
import { System } from "../system";
import { Query } from "../query";
import { gridHex } from "./grid";

const minScale = 0.4;

export class RenderingSystem extends System {
  renderable: Query<"render" | "position">;
  selectable: Query<"selection" | "position">;
  parent: HTMLCanvasElement;
  viewport: Viewport;
  p5: P5;
  prevScale: number = minScale;

  constructor(sim: Sim) {
    super(sim);
    this.parent = document.querySelector("#canvasRoot")!;
    this.renderable = new Query(sim, ["render", "position"]);
    this.selectable = new Query(sim, ["selection", "position"]);

    this.init();
  }

  init = () => {
    const settingsEntity = this.sim.queries.selectionManager.get()[0];

    const app = new PIXI.Application({
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
      width: window.innerWidth,
      height: window.innerHeight,
      view: this.parent,
    });

    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      interaction: app.renderer.plugins.interaction,
    });

    app.stage.addChild(viewport);

    viewport.drag().pinch().wheel();
    viewport.clampZoom({ minScale });
    viewport.on("drag-start", () => {
      settingsEntity.cp.selectionManager.focused = false;
      viewport.plugins.remove("follow");
    });
    viewport.sortableChildren = true;

    this.viewport = viewport;
    gridHex(100, this.viewport, { color: 0x1d1d1d, width: 1 });
    gridHex(1000, this.viewport, { color: 0x292929, width: 3 });
  };

  exec(): void {
    const settingsEntity = this.sim.queries.selectionManager.get()[0];

    this.sim.queries.renderable.get().forEach((entity) => {
      const entityRender = entity.cp.render;
      const selected = entity === settingsEntity.cp.selectionManager.entity;

      if (!entityRender.initialized) {
        this.viewport.addChild(entityRender.sprite);
        if (entity.hasComponents(["selection"])) {
          entityRender.sprite.interactive = true;
          entityRender.sprite.on("mousedown", () => {
            settingsEntity.cp.selectionManager.set(entity);
          });
          entityRender.sprite.cursor = "pointer";
        }

        entityRender.initialized = true;
      }

      entityRender.sprite.position.set(
        entity.cp.position.x * 10,
        entity.cp.position.y * 10
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

    if (settingsEntity.cp.selectionManager.focused) {
      this.viewport.follow(
        settingsEntity.cp.selectionManager.entity!.requireComponents(["render"])
          .cp.render.sprite
      );
    }

    this.prevScale = this.viewport.scale.x;
  }
}
