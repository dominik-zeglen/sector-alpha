import type { RequireComponent } from "@core/tsHelpers";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { gameStore } from "@ui/state/game";
import type { Entity } from "@core/entity";
import type { EntityMesh } from "../EntityMesh";

export function createDeployFacilityHandler(
  engine: Engine3D,
  meshes: WeakMap<Entity, EntityMesh>
) {
  return (entity: RequireComponent<"position">) => {
    const mesh = engine.getByEntityId(entity.id);
    mesh?.destroy();
    mesh?.setParent(null);
    meshes.delete(entity);
    gameStore.clearSelection();
  };
}
