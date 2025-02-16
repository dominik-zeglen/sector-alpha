import type { RequirePureComponent } from "@core/tsHelpers";
import type { ObserverFn } from "@core/utils/observer";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { KineticGunParticleGenerator } from "@ogl-engine/particles/kineticGun";
import { Mat4, Quat, Vec3 } from "ogl";

export function createShootHandler(
  engine: Engine3D
): ObserverFn<RequirePureComponent<"position" | "damage">> {
  return (entity) => {
    const shooter = engine!.getByEntityId(entity.id);

    if (!shooter) return;
    const target = engine.getByEntityId(entity.cp.damage.targetId!);
    if (!target) return;

    const generator = new KineticGunParticleGenerator(engine);
    generator.setParent(shooter);

    const position = new Vec3();
    const lookAtMatrix = new Mat4();
    const lookAtQuaternion = new Quat();

    generator.mesh.onBeforeRender(() => {
      generator.worldMatrix.getTranslation(position);
      lookAtMatrix.lookAt(position, target.position, new Vec3(0, 1, 0));

      lookAtMatrix.getRotation(lookAtQuaternion);
      const invQuat = new Quat().copy(shooter.quaternion).inverse();
      lookAtQuaternion.multiply(invQuat);

      generator.quaternion.copy(lookAtQuaternion);
      generator.rotation.fromQuaternion(generator.quaternion);
      generator.rotation.y += Math.PI / 2;

      generator.updateMatrixWorld(true);
    });
  };
}
