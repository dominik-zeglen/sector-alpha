import type { RequirePureComponent } from "@core/tsHelpers";
import { Observable } from "@core/utils/observer";

export class Transport3D {
  hooks: {
    shoot: Observable<RequirePureComponent<"position" | "damage">>;
    explode: Observable<RequirePureComponent<"position">>;
    deployFacility: Observable<RequirePureComponent<"position">>;
  };

  constructor() {
    this.hooks = {
      shoot: new Observable("shoot"),
      explode: new Observable("explode"),
      deployFacility: new Observable("deployFacility"),
    };
  }

  reset() {
    this.hooks.shoot.observers.clear();
    this.hooks.explode.observers.clear();
  }
}

export const transport3D = new Transport3D();
