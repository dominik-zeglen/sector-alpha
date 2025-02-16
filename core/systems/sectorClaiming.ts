import type { Sim } from "../sim";
import { System } from "./system";
import { defaultIndexer } from "./utils/default";
import { EntityIndex } from "./utils/entityIndex";

export class SectorClaimingSystem extends System<"exec"> {
  hubIndex = new EntityIndex(["parent"], ["facilityModuleType:hub"]);
  hiveIndex = new EntityIndex(
    ["name", "parent"],
    ["facilityModuleType:special"]
  );

  apply = (sim: Sim): void => {
    super.apply(sim);
    this.hubIndex.apply(sim);
    this.hiveIndex.apply(sim);

    this.cooldowns.timers.exec = 2;
    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (): void => {
    this.cooldowns.doEvery("exec", 1, () => {
      const hubs = this.hubIndex
        .get()
        .map((e) =>
          this.sim
            .getOrThrow(e.cp.parent.id)
            .requireComponents(["owner", "position"])
        );
      const hives = this.hiveIndex
        .get()
        .filter((e) => e.cp.name.slug === "tauHive")
        .map((e) =>
          this.sim
            .getOrThrow(e.cp.parent.id)
            .requireComponents(["owner", "position"])
        );

      for (const sector of defaultIndexer.sectors.getIt()) {
        if (sector.hasComponents(["owner"])) {
          const hubOrHive = [...hubs, ...hives].find(
            (h) =>
              h.cp.position.sector === sector.id &&
              h.cp.owner.id === sector.cp.owner.id
          );
          if (!hubOrHive) {
            sector.removeComponent("owner");
            return;
          }
        } else {
          const hubOrHive = [...hubs, ...hives].find(
            (h) => h.cp.position.sector === sector.id
          );

          if (hubOrHive) {
            sector.addComponent({ name: "owner", id: hubOrHive.cp.owner.id });
          }
        }
      }
    });
  };
}

export const sectorClaimingSystem = new SectorClaimingSystem();
