import React from "react";
import type { Transform } from "ogl";
import { Raycast, Vec2, Vec3 } from "ogl";
import { defaultIndexer } from "@core/systems/utils/default";
import { find } from "@fxts/core";
import { OglCanvas } from "@ogl-engine/OglCanvas";
import { MapControl } from "@ogl-engine/MapControl";
import { defaultClickSound } from "@kit/BaseButton";
import { assetLoader } from "@ogl-engine/AssetLoader";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import { selectingSystem } from "@core/systems/selecting";
import { Path } from "@ogl-engine/utils/path";
import type { SkyboxTexture } from "@assets/textures/skybox";
import { Scene } from "@ogl-engine/engine/Scene";
import type { Sim } from "@core/sim";
import { contextMenuStore } from "@ui/state/contextMenu";
import { storageHook } from "@core/hooks";
import type { GameSettings } from "@ui/hooks/useGameSettings";
import type { MouseButton } from "@ogl-engine/Orbit";
import { Asteroids } from "@ogl-engine/engine/Asteroids";
import { fieldColors } from "@core/archetypes/asteroid";
import type { Destroyable } from "@ogl-engine/types";
import { Engine3D } from "@ogl-engine/engine/engine3d";
import { gameStore } from "@ui/state/game";
import { reaction } from "mobx";
import type { Position2D } from "@core/components/position";
import mapData from "../../../core/world/data/map.json";
import { EntityMesh } from "./EntityMesh";

// FIXME: This is just an ugly hotfix to keep distance between things larger
const scale = 2;

function isDestroyable(mesh: Transform): mesh is Transform & Destroyable {
  return !!(mesh as any).destroy;
}

export class TacticalMap extends React.PureComponent<{ sim: Sim }> {
  engine: Engine3D;
  sim: Sim;
  raycast = new Raycast();
  raycastHits: EntityMesh[] = [];
  lastClicked = 0;
  control: MapControl;
  meshes: Map<number, EntityMesh> = new Map();

  onUnmountCallbacks: (() => void)[] = [];

  constructor(props) {
    super(props);
    this.sim = props.sim;
    this.engine = new Engine3D();
  }

  componentDidMount(): void {
    gameStore.setSector(
      find(
        (s) => s.cp.name.value === "Teegarden's Star II",
        this.sim.index.sectors.get()
      )!
    );

    this.engine.hooks.onInit.subscribe("TacticalMap", () =>
      this.onEngineInit()
    );
    this.engine.hooks.onUpdate.subscribe("TacticalMap", () =>
      this.onEngineUpdate()
    );
    const disposer = reaction(
      () => gameStore.sector,
      () => {
        if (this.engine.initialized) {
          this.onSectorChange();
        }
      }
    );
    this.onUnmountCallbacks.push(disposer);
    selectingSystem.hook.subscribe("TacticalMap", (...args) =>
      this.onSelectedChange(...args)
    );
    storageHook.subscribe("TacticalMap", (key) => {
      if (key !== "gameSettings") return;
      this.updateEngineSettings();
    });
  }

  componentWillUnmount(): void {
    this.onUnmountCallbacks.forEach((cb) => cb());
  }

  async onControlClick(mousePosition: Vec2, button: MouseButton) {
    let targetId;
    if (this.raycastHits.length) {
      let mesh = this.raycastHits[0];
      if (
        gameStore.selectedUnit?.id === mesh.entityId &&
        this.raycastHits.length > 1
      ) {
        mesh = this.raycastHits[1];
      }
      // eslint-disable-next-line default-case
      switch (button) {
        case 0:
          gameStore.unfocusUnit();
          gameStore.setSelectedUnit(this.sim.getOrThrow(mesh.entityId));
          defaultClickSound.play();

          if (Date.now() - this.lastClicked < 200) {
            gameStore.focusUnit();
          }

          this.lastClicked = Date.now();
          break;
        case 2:
          targetId = mesh.entityId;
      }
    }

    if (button === 2) {
      const worldPos = this.raycast.intersectPlane({
        origin: new Vec3(0),
        normal: new Vec3(0, 1, 0),
      });
      const worldPosition: Position2D = [
        worldPos.x / scale,
        worldPos.z / scale,
      ];

      contextMenuStore.open({
        position: mousePosition.clone().toArray() as Position2D,
        worldPosition,
        sector: gameStore.sector,
        target: targetId ? this.sim.getOrThrow(targetId) : null,
      });
    }
  }

  async onEngineUpdate() {
    if (!(assetLoader.ready && this.engine.isFocused())) return;

    for (const entity of defaultIndexer.renderable.getIt()) {
      if (entity.cp.position.sector !== gameStore.sector.id) {
        if (this.meshes.has(entity.id)) {
          this.meshes.get(entity.id)!.destroy();
          this.engine.scene.removeChild(this.meshes.get(entity.id)!);
          this.meshes.delete(entity.id);
        }
        continue;
      }
      // FIXME: Remove this debug code
      if (!(entity.cp.render.model in assetLoader.models)) {
        // eslint-disable-next-line no-console
        console.log("Missing model:", entity.cp.render.model);
        if (entity.hasComponents(["dockable"])) {
          entity.cp.render.model = "ship/dart";

          if (entity.cp.dockable.size === "medium") {
            entity.cp.render.model = "ship/mCiv";
          }

          if (entity.cp.dockable.size === "large") {
            entity.cp.render.model = "ship/lMil";
          }

          if (entity.cp.model?.slug === "dart") {
            entity.cp.render.model = "ship/dart";
          }
        } else if (entity.hasTags(["facility"])) {
          if (entity.tags.has("gateway")) {
            entity.cp.render.model = "facility/gateway";
          } else {
            entity.cp.render.model = "facility/default";
          }
        }
      }

      if (!this.meshes.has(entity.id)) {
        const mesh = new EntityMesh(this.engine, entity);
        this.engine.scene.addChild(mesh);
        this.meshes.set(entity.id, mesh);
      }

      const mesh = this.meshes.get(entity.id)!;
      mesh.updatePosition();
    }

    const normalisedMousePos = new Vec2(
      2.0 * (this.control!.mouse.x / this.engine.gl.renderer.width) - 1.0,
      2.0 * (1.0 - this.control!.mouse.y / this.engine.gl.renderer.height) - 1.0
    );
    this.raycast.castMouse(this.engine.camera, normalisedMousePos);
    this.raycastHits = this.raycast.intersectBounds([
      ...this.meshes.values(),
    ]) as EntityMesh[];

    this.engine.canvas.style.cursor = this.raycastHits.length
      ? "pointer"
      : "default";

    const path = this.engine.scene.children.find((c) => c instanceof Path) as
      | Path
      | undefined;
    if (path && gameStore.selectedUnit) {
      path.update(
        Path.getPath(
          gameStore.selectedUnit.requireComponents(["position", "orders"]),
          scale
        )
      );
    }

    if (gameStore.unitFocused && gameStore.selectedUnit) {
      const entity = gameStore.selectedUnit.requireComponents(["position"]);
      this.control!.lookAt(
        new Vec3(
          entity.cp.position.coord[0] * scale,
          0,
          entity.cp.position.coord[1] * scale
        )
      );

      if (gameStore.sector.id !== entity.cp.position.sector) {
        gameStore.setSector(this.sim.getOrThrow(entity.cp.position.sector));
      }
    }
    this.control!.update();
  }

  async onEngineInit() {
    await assetLoader.load(this.engine.gl);

    this.control = new MapControl(this.engine.camera, this.engine.canvas);
    this.control.onClick = this.onControlClick.bind(this);
    this.control.onPan = () => {
      gameStore.unfocusUnit();
    };
    this.control.isFocused = this.engine.isFocused.bind(this.engine);
    this.control.onKeyDown = this.onKeyDown.bind(this);

    this.updateEngineSettings();
    this.loadSector();
  }

  onKeyDown(event: KeyboardEvent) {
    const selectedEntity = gameStore.selectedUnit?.requireComponents([
      "position",
    ]);

    if (event.code === "KeyR" && selectedEntity) {
      if (selectedEntity.cp.position.sector !== gameStore.sector.id) {
        gameStore.setSector(
          this.sim.getOrThrow(selectedEntity.cp.position.sector)
        );
      }
      this.control.lookAt(
        new Vec3(
          selectedEntity.cp.position.coord[0] * scale,
          0,
          selectedEntity.cp.position.coord[1] * scale
        )
      );
    }
  }

  onSectorChange() {
    this.engine.scene.traverse((mesh) => {
      if (isDestroyable(mesh)) {
        mesh.destroy();
      }
    });

    this.engine.setScene(new Scene(this.engine));
    this.loadSector();
  }

  onSelectedChange([prevId, id]: (number | null)[]) {
    if (prevId) {
      this.meshes.get(prevId)?.setSelected(false);
      const path = this.engine.scene.children.find((c) => c instanceof Path);
      if (path) {
        this.engine.scene.removeChild(path);
      }
    }
    if (id) {
      this.meshes.get(id)?.setSelected(true);
      const entity = this.sim.getOrThrow(id);
      if (entity.hasComponents(["position", "orders"])) {
        const path = new Path(this.engine);
        this.engine.scene.addChild(path);
      }
    }
  }

  updateEngineSettings() {
    const settings: GameSettings = JSON.parse(
      localStorage.getItem("gameSettings")!
    );

    this.engine.fxaa = settings.graphics.fxaa;
    this.engine.postProcessing = settings.graphics.postProcessing;
  }

  loadSector() {
    this.loadSkybox();
    this.loadAsteroidFields();
  }

  loadSkybox() {
    let skybox = this.engine.scene.children.find((c) => c instanceof Skybox);
    if (!skybox) {
      skybox = new Skybox(
        this.engine,
        (mapData.sectors.find((s) => s.id === gameStore.sector.cp.name.slug)
          ?.skybox as SkyboxTexture) ?? "example"
      );
      skybox.setParent(this.engine.scene);
    }
  }

  loadAsteroidFields() {
    const fields = this.sim.index.asteroidFields.getIt();
    for (const field of fields) {
      if (field.cp.position.sector === gameStore.sector.id) {
        const fieldTransform = new Asteroids(
          this.engine,
          field.cp.asteroidSpawn.size,
          1,
          fieldColors[field.cp.asteroidSpawn.type]
        );
        fieldTransform.position.set(
          field.cp.position.coord[0] * scale,
          0,
          field.cp.position.coord[1] * scale
        );
        fieldTransform.scale.set(scale);
        this.engine.scene.addChild(fieldTransform);
      }
    }
  }

  render() {
    return <OglCanvas engine={this.engine} />;
  }
}
