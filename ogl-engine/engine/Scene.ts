import { Transform } from "ogl";
import type { Skybox } from "@ogl-engine/materials/skybox/skybox";
import type { EntityMesh } from "@ui/components/TacticalMap/EntityMesh";
import type { FolderApi } from "tweakpane";
import { pane } from "@ui/context/Pane";
import type { Engine } from "./engine";
import type { BaseMesh2D } from "./BaseMesh2D";
import type { Engine3D } from "./engine3d";

export class Scene extends Transform {
  engine: Engine<any>;
  name = "Scene";

  constructor(engine: Engine<any>) {
    super();

    this.engine = engine;
  }
}

export class TacticalMapScene extends Scene {
  engine: Engine3D;
  entities: Transform & { children: EntityMesh[] };
  props: Transform;
  ui: Transform;
  skybox: Skybox;

  pane: FolderApi;

  constructor(engine: Engine<TacticalMapScene>) {
    super(engine);

    this.entities = new Transform() as Omit<Transform, "children"> & {
      children: EntityMesh[];
    };
    this.entities.name = "Entities";
    this.entities.setParent(this);

    this.props = new Transform();
    this.props.name = "Props";
    this.props.setParent(this);

    this.ui = new Transform();
    this.ui.name = "UI";
    this.ui.setParent(this);

    this.initPane();
  }

  getEntity(id: number) {
    return this.entities.children.find(
      (entity) => entity.name === `Entity:${id}`
    );
  }

  getProp(name: string) {
    return this.props.children.find((prop) => prop.name === name);
  }

  addSkybox(skybox: Skybox) {
    this.skybox = skybox;
    this.skybox.setParent(this);
  }

  initPane() {
    this.pane = pane.addFolder({
      title: "Post Processing",
    });
    this.pane.addBinding(
      this.engine.uniforms.env.postProcessing.godrays.uWeight,
      "value",
      {
        label: "God Rays Weight",
      }
    );
    this.pane.addBinding(
      this.engine.uniforms.env.postProcessing.godrays.uDensity,
      "value",
      {
        label: "God Rays Density",
      }
    );
    this.pane.addBinding(
      this.engine.uniforms.env.postProcessing.godrays.uDecay,
      "value",
      {
        label: "God Rays Decay",
        max: 1,
        min: 0.2,
      }
    );
    this.pane.addBinding(
      this.engine.uniforms.env.postProcessing.godrays.uExposure,
      "value",
      {
        label: "God Rays Exposure",
      }
    );
    this.pane.addBinding(
      this.engine.uniforms.env.postProcessing.bloom.uBloomStrength,
      "value",
      {
        label: "Bloom Strength",
      }
    );
  }

  destroy() {
    this.pane.dispose();
  }
}

export class StrategicMapScene extends Transform {
  engine: Engine<StrategicMapScene>;
  name = "Scene";

  entities: Transform & { children: BaseMesh2D[] };
  sectors: Transform;

  private entityMap = new Map<number, BaseMesh2D>();

  constructor(engine: Engine<StrategicMapScene>) {
    super();

    this.engine = engine;
    this.sectors = new Transform();
    this.sectors.name = "Sectors";
    this.sectors.setParent(this);

    this.entities = new Transform() as Omit<Transform, "children"> & {
      children: BaseMesh2D[];
    };
    this.entities.name = "Entities";
    this.entities.setParent(this);
  }

  getSector(id: number) {
    return this.sectors.children.find(
      (sector) => sector.name === `Sector:${id}`
    );
  }

  addEntity(entity: BaseMesh2D, id: number) {
    this.entities.addChild(entity);
    this.entityMap[id] = entity;
  }

  removeEntity(id: number) {
    const mesh = this.getEntity(id);
    if (mesh) {
      mesh.setParent(null);
    }
    this.entityMap.delete(id);
  }

  getEntity(id: number) {
    return this.entityMap[id];
  }
}
