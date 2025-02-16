import { ParticleGenerator } from "@ogl-engine/ParticleGenerator";
import { Vec3, Vec4 } from "ogl";
import { random } from "mathjs";
import { OrbMaterial } from "@ogl-engine/materials/orb/orb";
import Color from "color";
import { loopToZero } from "@ogl-engine/easing";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

const particleSize = 0.4;
const particleLife = 1.5;
const maxRadius = 0.8;

export class HyperSlingshotParticleGenerator extends ParticleGenerator {
  constructor(engine: Engine3D) {
    super(
      engine,
      (particle) => {
        const angle = random(0, Math.PI * 2);
        const radius = random(0, maxRadius);
        particle.position.set(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );
        particle.acceleration = new Vec3(0, random(0.5, 0.8), 0);
        particle.velocity = new Vec3(0, random(0.3, 0.5), 0);
        particle.life =
          (particleLife *
            random(0.8, 1) *
            Math.abs(
              Math.cos(((maxRadius - radius) / maxRadius) * 2 * Math.PI)
            ) *
            (maxRadius - radius)) /
          maxRadius;
      },
      1000
    );

    this.spawnRate = 500;

    this.onParticleUpdate = (particle) => {
      particle.t = particle.life / particleLife;
      const size = loopToZero(1 - particle.life / particleLife) * particleSize;
      particle.scale
        .set(size / 20, size, size / 20)
        .scaleRotateMatrix4(this.worldMatrix);
    };

    const material = new OrbMaterial(
      engine,
      new Vec4(...Color("#ff1f7c").alpha(0.3).array()),
      new Vec4(...Color("#ffa71d").alpha(1).array())
    );
    material.uniforms.fEmissive.value = 1;
    this.mesh.applyMaterial(material);
  }
}
