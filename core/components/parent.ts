import { BaseComponent } from "./component";

export interface Parent extends BaseComponent<"parent"> {
  id: number;
}
