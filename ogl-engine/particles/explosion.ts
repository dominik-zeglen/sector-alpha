import { OneShotParticleGenerator } from "@ogl-engine/ParticleGenerator";
import { Vec4 } from "ogl";
import { random } from "mathjs";
import { loopToZero } from "@ogl-engine/easing";
import { OrbMaterial } from "@ogl-engine/materials/orb/orb";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

const particleSize = 0.15;
const particleLife = 1.1;

export class ExplosionParticleGenerator extends OneShotParticleGenerator {
  constructor(engine: Engine3D) {
    super(
      engine,
      (particle) => {
        const phi = random(0, Math.PI * 2);
        const theta = random(0, Math.PI);
        const acceleration = -random(0.06, 0.12);
        const velocity =
          (Math.random() > 0.8 ? random(2.2, 3.1) : random(1.1, 1.6)) *
          1.5 *
          Math.sin(theta * 6) *
          Math.sin(phi * 6);

        particle.acceleration
          .set(
            Math.sin(theta) * Math.cos(phi),
            Math.cos(theta),
            Math.sin(theta) * Math.sin(phi)
          )
          .multiply(acceleration);
        particle.velocity
          .set(
            Math.sin(theta) * Math.cos(phi),
            Math.cos(theta),
            Math.sin(theta) * Math.sin(phi)
          )
          .multiply(velocity);
        particle.life = particleLife;
        particle.scale.set(1);
      },
      3000
    );

    this.spawnRate = 9000;

    this.onParticleUpdate = (particle) => {
      particle.t = particle.life / particleLife;
      const size =
        (loopToZero(particle.life / particleLife) * particleSize) / 2;
      particle.scale.set(size, size, size);
    };

    const material = new OrbMaterial(
      engine,
      new Vec4(...Color("#ff250b").alpha(0.3).array()),
      new Vec4(...Color("#fffd8c").alpha(1).array())
    );
    material.uniforms.fEmissive.value = 1;
    this.mesh.applyMaterial(material);
  }
}
