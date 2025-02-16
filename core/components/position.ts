import type { Vec2 } from "ogl";
import type { BaseComponent } from "./component";

export interface Position extends BaseComponent<"position"> {
  angle: number;
  readonly coord: Vec2;
  sector: number;
  moved: boolean;
}
