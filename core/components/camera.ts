import type { Vec2 } from "ogl";
import type { BaseComponent } from "./component";

export interface Camera extends BaseComponent<"camera"> {
  zoom: number;
  readonly position: Vec2;
}
