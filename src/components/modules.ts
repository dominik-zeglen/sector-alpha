import { BaseComponent } from "./component";

export interface Modules extends BaseComponent<"modules"> {
  ids: number[];
}
