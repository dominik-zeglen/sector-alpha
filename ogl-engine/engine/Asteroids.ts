import { Euler, Geometry, Mat3, Mat4, Plane, Quat, Transform } from "ogl";
import type { ModelName } from "@ogl-engine/AssetLoader";
import { assetLoader } from "@ogl-engine/AssetLoader";
import { entityScale } from "@ui/components/TacticalMap/EntityMesh";
import { random } from "mathjs";
import { InstancedPhongMaterial } from "@ogl-engine/materials/instancedPhong/instancedPhong";
import { AsteroidFieldRingMaterial } from "@ogl-engine/materials/asteroidFieldRing/asteroidFieldRing";
import { BaseMesh } from "./BaseMesh";
import type { Engine3D } from "./engine3d";

export class Asteroids extends Transform {
  name = "Asteroids";
  size: number;
  density: number;
  engine: Engine3D;

  constructor(engine: Engine3D, size: number, density: number, color: string) {
    super();

    this.engine = engine;
    this.size = size;
    this.density = density;

    this.visible = false;
    this.createAsteroids();
    this.createRing(color);
  }

  static getScale() {
    const t = Math.random();

    if (t < 0.8) return random(9, 15);

    return random(20, 50);
  }

  private createRing(color: string) {
    const ring = new BaseMesh(this.engine, {
      geometry: new Plane(this.engine.gl),
    });
    const material = new AsteroidFieldRingMaterial(this.engine);
    material.setColor(color);
    ring.applyMaterial(material);

    ring.position.y = -11 * entityScale;
    ring.scale.set(this.size * 2);
    ring.rotation.x = -Math.PI / 2;
    ring.setParent(this);
  }

  private async createAsteroids() {
    const numAsteroids = this.size ** 2 * this.density * 0.75;

    await assetLoader.load(this.engine.gl);
    const asteroidModels: ModelName[] = [
      "world/asteroid1",
      "world/asteroid2",
      "world/asteroid3",
      "world/asteroid4",
    ];

    for (const model of asteroidModels) {
      const gltf = assetLoader.model(model);

      const asteroid = new BaseMesh(this.engine, {
        geometry: new Geometry(this.engine.gl, { ...gltf.geometry.attributes }),
      });
      asteroid.applyMaterial(
        new InstancedPhongMaterial(this.engine, gltf.material)
      );
      const instanceMatrix = new Float32Array(numAsteroids * 16);
      const instanceNormalMatrix = new Float32Array(numAsteroids * 9);

      for (let i = 0; i < numAsteroids; i++) {
        const angle = random(0, Math.PI * 2);
        const radius = random(0, this.size);

        const t = new Mat4().identity();
        t[12] = Math.cos(angle) * radius;
        t[13] =
          Math.cos(((radius / this.size) * Math.PI) / 2) ** 2 *
          random(-this.size / 10, this.size / 10);
        t[14] = Math.sin(angle) * radius;

        const r = new Mat4().fromQuaternion(
          new Quat().fromEuler(
            new Euler(
              random(0, Math.PI * 2),
              random(0, Math.PI * 2),
              random(0, Math.PI * 2)
            )
          )
        );

        const s = new Mat4()
          .identity()
          .multiply(entityScale * Asteroids.getScale());
        s[15] = 1;

        const trs = t.multiply(r).multiply(s);
        trs.toArray(instanceMatrix, i * 16);

        const normalMatrix = new Mat3(
          r[0],
          r[1],
          r[2],
          r[4],
          r[5],
          r[6],
          r[8],
          r[9],
          r[10]
        ).inverse();
        instanceNormalMatrix.set(
          [
            normalMatrix[0],
            normalMatrix[3],
            normalMatrix[6],
            normalMatrix[1],
            normalMatrix[4],
            normalMatrix[7],
            normalMatrix[2],
            normalMatrix[5],
            normalMatrix[8],
          ],
          i * 9
        );
      }

      asteroid.geometry.addAttribute("instanceMatrix", {
        instanced: true,
        size: 16,
        data: instanceMatrix,
        needsUpdate: true,
      });
      asteroid.geometry.addAttribute("instanceNormalMatrix", {
        instanced: true,
        size: 9,
        data: instanceNormalMatrix,
        needsUpdate: true,
      });

      asteroid.frustumCulled = false;
      asteroid.setParent(this);
    }

    this.visible = true;
  }
}
