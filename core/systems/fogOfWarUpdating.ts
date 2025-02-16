import type { Sim } from "@core/sim";
import { sectorSize } from "@core/archetypes/sector";
import { HideReason } from "@core/components/render";
import { actionLoader } from "@core/actionLoader";
import type { Vec2 } from "ogl";
import { System } from "./system";
import { EntityIndex } from "./utils/entityIndex";

let sectorMaps: Record<number, Uint8Array> = {};
const divisions = 2 ** 6;

export class FogOfWarUpdatingSystem extends System<"exec"> {
  entitiesWithInfluence = new EntityIndex(["position", "owner"]);
  entitiesToHide = new EntityIndex(["position", "render"]);
  enabled = true;
  intervalHandle: number | null = null;

  apply = (sim: Sim): void => {
    super.apply(sim);

    actionLoader.register(
      {
        category: "core",
        type: "basic",
        description: "Toggle fog of war",
        name: "Fog of war",
        fn: () => {
          this.enabled = !this.enabled;
          if (!this.enabled) {
            for (const entity of this.sim.index.facilities.getIt()) {
              entity.addTag("discovered");
            }
          }
        },
        slug: "fogOfWar",
      },
      this.constructor.name
    );

    this.entitiesToHide.apply(sim);
    this.entitiesWithInfluence.apply(sim);

    sim.hooks.phase.init.subscribe(this.constructor.name, this.updateFog);
  };

  destroy = (): void => {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  };

  updateFog = () => {
    this.cooldowns.doEvery("exec", 0.3, () => {
      sectorMaps = {};

      const player = this.sim.index.player.get()[0];

      for (const entity of this.entitiesWithInfluence.getIt()) {
        const position = entity.cp.position;
        const owner = entity.cp.owner;
        if (owner.id !== player.id) continue;

        const sectorId = position.sector;
        if (!sectorMaps[sectorId]) {
          sectorMaps[sectorId] = new Uint8Array(divisions ** 2);
        }

        const [x, y] = FogOfWarUpdatingSystem.getBox(position.coord);

        const r = entity.tags.has("facility") ? 8 : 5;

        for (let i = -r; i <= r; i++) {
          for (let j = -r; j <= r; j++) {
            if (i ** 2 + j ** 2 > r ** 2) continue;
            sectorMaps[sectorId][(y + i) * divisions + x + j] = 1;
          }
        }
      }

      for (const entity of this.entitiesToHide.getIt()) {
        if (entity.cp.dockable?.dockedIn || entity.cp.owner?.id === player.id)
          continue;

        if (!this.enabled) {
          entity.cp.render.hidden &= ~HideReason.FogOfWar;
        } else {
          const [x, y] = FogOfWarUpdatingSystem.getBox(
            entity.cp.position.coord
          );

          entity.cp.render.hidden =
            sectorMaps[entity.cp.position.sector]?.[y * divisions + x] ||
            entity.tags.has("discovered")
              ? entity.cp.render.hidden & ~HideReason.FogOfWar
              : entity.cp.render.hidden | HideReason.FogOfWar;
          if (
            !entity.cp.render.hidden &&
            (entity.tags.has("facility") || entity.tags.has("collectible"))
          ) {
            entity.addTag("discovered");
          }
        }
      }
    });
  };

  static getBox = (pos: Vec2): [number, number] => [
    Math.floor((pos[0] * divisions) / 2 / (sectorSize / 10) + divisions / 2),
    Math.floor((pos[1] * divisions) / 2 / (sectorSize / 10) + divisions / 2),
  ];

  static getMaps = () => sectorMaps;

  static getDivisions = () => divisions;
}

export const fogOfWarUpdatingSystem = new FogOfWarUpdatingSystem();
