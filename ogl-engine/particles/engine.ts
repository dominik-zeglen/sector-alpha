import { ParticleGenerator } from "@ogl-engine/ParticleGenerator";
import { Vec4 } from "ogl";
import { random } from "mathjs";
import { loopToZero } from "@ogl-engine/easing";
import { OrbMaterial } from "@ogl-engine/materials/orb/orb";
import Color from "color";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

const baseSpawn = 600;

export class EngineParticleGenerator extends ParticleGenerator {
  life = 0.15;
  size = 0.02;
  global = false;

  constructor(engine: Engine3D) {
    super(
      engine,
      (particle) => {
        particle.position
          .set(random(-1, 1), random(-0.4, 0.4), random(-1, 1))
          .divide(1200);
        particle.acceleration.set(0, random(30, 60), 0).divide(100);
        particle.velocity.set(0, random(1, 2.5), 0).divide(10);
        particle.life = this.life;
        particle.scale.set(1);
      },
      500
    );

    this.spawnRate = baseSpawn;
    this.setIntensity(1);

    this.onParticleUpdate = (particle) => {
      particle.t = particle.life / this.life;
      const size = (loopToZero(particle.life / this.life) * this.size) / 2;
      particle.scale.set(size, size, size);
    };

    const material = new OrbMaterial(
      engine,
      new Vec4(...Color("#1ff4ff").alpha(0.3).array()),
      new Vec4(...Color("#ffffff").alpha(1).array()),
      this.global
    );
    material.uniforms.fEmissive.value = 1;
    this.mesh.applyMaterial(material);
  }

  setIntensity(intensity: number) {
    const i = intensity === 0 ? 0 : Math.min(Math.max(intensity, 0.3), 3);
    this.spawnRate = baseSpawn * i;
    this.life = 0.15 * i;
  }
}
