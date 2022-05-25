import { NonNullableFields } from "../tsHelpers";
import { BaseComponent } from "./component";
import { EntityId } from "./utils/entityId";

export interface Parent
  extends BaseComponent<"parent">,
    NonNullableFields<EntityId> {}
