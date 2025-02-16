import type { RequirePureComponent } from "@core/tsHelpers";
import type { ObserverFn } from "@core/utils/observer";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { ExplosionParticleGenerator } from "@ogl-engine/particles/explosion";
import { entityScale } from "../EntityMesh";

export function createExplodeHandler(
  engine: Engine3D
): ObserverFn<RequirePureComponent<"position">> {
  return (entity) => {
    const mesh = engine.getByEntityId(entity.id);
    if (mesh) {
      const explosion = new ExplosionParticleGenerator(engine!);
      explosion.scale.set(
        (mesh.geometry.bounds.max.sub(mesh.geometry.bounds.min).len() *
          entityScale) /
          2
      );
      explosion.setParent(engine.scene);
      explosion.position.copy(mesh.position);
    }
  };
}
