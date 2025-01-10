import type { RequireComponent } from "@core/tsHelpers";
import type { ParticleGeneratorInput } from "@ogl-engine/AssetLoader";
import { assetLoader } from "@ogl-engine/AssetLoader";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";
import type { EngineParticleGenerator } from "@ogl-engine/particles";
import { getParticleType, particleGenerator } from "@ogl-engine/particles";
import { Light } from "@ogl-engine/engine/Light";
import { Plane } from "ogl";
import { ship } from "@core/archetypes/ship";
import { EntityIndicatorMaterial } from "@ogl-engine/materials/entityIndicator/entityIndicator";
import type { Engine3D } from "@ogl-engine/engine/engine3d";

export const entityScale = 1 / 220;
// FIXME: Remove after distance rebalancing
const scale = 2;

export class EntityIndicator extends BaseMesh<EntityIndicatorMaterial> {
  name = "EntityIndicator";
  parent: EntityMesh;

  constructor(engine: Engine3D) {
    super(engine, {
      geometry: new Plane(engine.gl),
    });
    this.applyMaterial(new EntityIndicatorMaterial(engine));
    this.frustumCulled = false;
  }

  override setParent(parent: EntityMesh) {
    super.setParent(parent);
  }
}

export class EntityMesh extends BaseMesh {
  engine: Engine3D;
  entityId: number;
  entity: RequireComponent<"render" | "position">;
  name = "EntityMesh";
  selected = false;
  hovered = false;
  indicator: EntityIndicator;

  constructor(
    engine: Engine3D,
    entity: RequireComponent<"render" | "position">
  ) {
    const gltf = assetLoader.model(entity.cp.render.model);

    super(engine, {
      geometry: gltf.geometry,
    });
    this.applyMaterial(new SimplePbrMaterial(engine, gltf.material));

    this.engine = engine;
    this.scale.set(entityScale);
    this.position.y = Math.random() * 5;
    this.entityId = entity.id;
    this.entity = entity;
    this.name = `EntityMesh:${entity.id}`;

    if (gltf.particles) {
      for (const input of gltf.particles) {
        this.addParticleGenerator(input);

        // FIXME: add this as a child after light refactor
        if (input.name.includes("hyperslingshot")) {
          const light = new Light(2, false);
          light.setColor("#fffd8c");
          this.addChild(light);
          this.engine.addLight(light);
        }
        if (input.name.includes("engine")) {
          const light = new Light(0.2, false);
          light.setColor("#1ff4ff");
          this.addChild(light);
          this.engine.addLight(light);
        }
      }
    }

    this.updatePosition();

    if (entity.tags.has("selection")) {
      this.indicator = new EntityIndicator(engine);
      this.indicator.setParent(this);
      this.indicator.material.setColor(entity.cp.render.color);
      this.indicator.material.setSize(entity.cp.dockable?.size ?? "large");
    }
  }

  updatePosition() {
    this.position.set(
      this.entity.cp.position.coord[0] * scale,
      0,
      this.entity.cp.position.coord[1] * scale
    );
    this.rotation.y = -this.entity.cp.position.angle;
    this.setVisibility(!this.entity.cp.render.hidden);
  }

  addParticleGenerator(input: ParticleGeneratorInput) {
    const type = getParticleType(input.name)!;
    const PGen = particleGenerator[type];
    const generator = new PGen(this.engine);
    generator.position.copy(input.position);
    generator.rotation.copy(input.rotation);
    generator.scale.copy(input.scale).multiply(1 / entityScale);
    generator.setParent(this);
    generator.updateMatrixWorld();

    const onUpdate = (delta: number) => {
      generator.update(delta);
      const entity = window.sim.get(this.entityId);

      if (!entity) return;

      if (type === "engine") {
        const gen = generator as any as EngineParticleGenerator;
        const shipEntity = ship(entity);

        gen.setIntensity(
          shipEntity.cp.movable.velocity / shipEntity.cp.drive.maneuver
        );
      }
    };
    this.engine.hooks.onUpdate.subscribe(this.name, onUpdate);
    this.onDestroyCallbacks.push(() => {
      this.engine.hooks.onUpdate.unsubscribe(onUpdate);
    });
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.indicator?.material.setSelected(selected);
  }

  setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.indicator?.material.setHovered(hovered);
  }
}
