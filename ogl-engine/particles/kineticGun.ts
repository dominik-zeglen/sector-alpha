import { OneShotParticleGenerator } from "@ogl-engine/ParticleGenerator";
import { Vec4 } from "ogl";
import { random } from "mathjs";
import { OrbMaterial } from "@ogl-engine/materials/orb/orb";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

const particleSize = 0.6;
const particleLife = 6;
const spread = 0.025;

export class KineticGunParticleGenerator extends OneShotParticleGenerator {
  constructor(engine: Engine3D) {
    super(
      engine,
      (particle) => {
        particle.acceleration.set(0);
        particle.velocity.set(
          random(700, 750),
          random(-spread, spread),
          random(-spread, spread)
        );
        particle.life = particleLife;
      },
      5
    );

    this.spawnRate = 40;

    this.onParticleUpdate = (particle) => {
      particle.t = particle.life / particleLife;
      particle.scale.set(particleSize);
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
