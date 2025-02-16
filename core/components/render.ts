import type { manifest } from "@assets/icons";
import type { ModelName } from "@ogl-engine/AssetLoader";
import type { BaseComponent } from "./component";

export type Textures = (typeof manifest)["frames"];
export type Layer =
  | "facility"
  | "ship"
  | "global"
  | "selection"
  | "collectible";

export interface RenderInput {
  color?: number;
  defaultScale: number;
  texture: keyof Textures;
  layer: Layer;
}

export interface Render extends BaseComponent<"render"> {
  color: number;
  defaultScale: number;
  texture: keyof Textures;
  model: ModelName;
  layer: Layer;
  name: "render";
  /**
   * Bitmask of reasons why the entity is hidden.
   */
  hidden: number;
  /**
   * Indicates that the sprite can be rotated.
   */
  static: boolean;
  interactive: boolean;
}

export const HideReason = {
  Manual: 1 << 0,
  Docked: 1 << 1,
  FogOfWar: 1 << 2,
};

export function createRender({
  color,
  defaultScale = 1,
  texture,
  layer,
}: RenderInput): Render {
  const component: Render = {
    color: color ?? 0xffffff,
    defaultScale,
    name: "render",
    layer,
    texture,
    // @ts-expect-error
    model: "",
    hidden: 0,
    static: false,
    interactive: false,
  };

  return component;
}

export function hide(render: Render) {
  render.hidden |= HideReason.Manual;
}

export function show(render: Render) {
  render.hidden &= ~HideReason.Manual;
}
