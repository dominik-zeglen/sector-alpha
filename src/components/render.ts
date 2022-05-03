import * as PIXI from "pixi.js";

export interface RenderInput {
  color?: number;
  defaultScale: number;
  maxZ: number;
  pathToTexture: string;
  zIndex: number;
}

export class Render {
  color: number;
  defaultScale: number = 1;
  initialized: boolean = false;
  maxZ: number;
  sprite: PIXI.Sprite;
  texture: string;
  zIndex: number;

  constructor({
    color,
    defaultScale,
    maxZ,
    pathToTexture,
    zIndex,
  }: RenderInput) {
    this.defaultScale = defaultScale;
    this.texture = pathToTexture;
    this.maxZ = maxZ;
    this.zIndex = zIndex;

    if (process.env.NODE_ENV !== "test") {
      this.sprite = new PIXI.Sprite(
        PIXI.Texture.from(pathToTexture, {
          resolution: 2,
          resourceOptions: {
            scale: 2,
          },
        })
      );
      this.sprite.anchor.set(0.5, 0.5);
      this.sprite.zIndex = zIndex;
      if (color) {
        this.sprite.tint = color;
        this.color = color;
      }
    }
  }
}

export class RenderGraphics {
  // eslint-disable-next-line no-unused-vars
  _draw: (g: PIXI.Graphics) => void;
  g: PIXI.Graphics;
  initialized: boolean = false;

  // eslint-disable-next-line no-unused-vars
  constructor(draw: (g: PIXI.Graphics) => void) {
    // eslint-disable-next-line no-underscore-dangle
    this._draw = draw;
    this.g = new PIXI.Graphics();
  }

  draw = (container: PIXI.Container) => {
    container.addChild(this.g);
    // eslint-disable-next-line no-underscore-dangle
    this._draw(this.g);
  };
}
