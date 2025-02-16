import { ParticleGenerator } from "@ogl-engine/ParticleGenerator";
import { Vec4 } from "ogl";
import { random } from "mathjs";
import { loopToZero } from "@ogl-engine/easing";
import { OrbMaterial } from "@ogl-engine/materials/orb/orb";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

const particleSize = 0.2;
const particleLife = 1.5;

export class FireParticleGenerator extends ParticleGenerator {
  constructor(engine: Engine3D) {
    super(
      engine,
      (particle) => {
        particle.acceleration
          .set(random(-8, 8), random(80, 100), random(-8, 8))
          .divide(1000);
        particle.velocity
          .set(random(-0.8, 0.8), random(3, 5), random(-0.8, 0.8))
          .divide(10);
        particle.life = particleLife;
        particle.scale.set(1);
      },
      300
    );

    this.spawnRate = 15;

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
