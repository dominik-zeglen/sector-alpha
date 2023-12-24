import type { Position2D } from "@core/components/position";
import { isDev } from "@core/settings";
import type { RequireComponent } from "@core/tsHelpers";
import { discriminate } from "@core/utils/maps";
import shuffle from "lodash/shuffle";
import { distance, add, random } from "mathjs";
import type { Facility } from "../../archetypes/facility";
import { createFacilityName, createFacility } from "../../archetypes/facility";
import { facilityModules } from "../../archetypes/facilityModule";
import type { Faction } from "../../archetypes/faction";
import type { Sector } from "../../archetypes/sector";
import { sectorSize } from "../../archetypes/sector";
import { hecsToCartesian } from "../../components/hecsPosition";
import type { PAC } from "../../components/production";
import { createCompoundProduction } from "../../components/production";
import { addStorage } from "../../components/storage";
import type { Commodity } from "../../economy/commodity";
import { commoditiesArray, mineableCommodities } from "../../economy/commodity";
import type { Sim } from "../../sim";
import { addFacilityModule } from "../../utils/entityModules";
import { pickRandom } from "../../utils/generators";
import { perCommodity } from "../../utils/perCommodity";
import {
  getResourceProduction,
  getResourceUsage,
  getSectorResources,
} from "../../utils/resources";
import { settleStorageQuota } from "../storageQuotaPlanning";
import { System } from "../system";

function isAbleToBuild(
  pac: Partial<PAC>,
  resourcesProducedByFacilities: Record<Commodity, number>,
  resourceUsageInFacilities: Record<Commodity, number>,
  stockpiling: number
) {
  return Object.entries(pac).every(([commodity, { consumes, produces }]) =>
    produces
      ? !Object.values<string>(mineableCommodities).includes(commodity)
      : resourcesProducedByFacilities[commodity] /
          (consumes + resourceUsageInFacilities[commodity]) >
        stockpiling
  );
}

export function addStartingCommodities(facility: RequireComponent<"storage">) {
  settleStorageQuota(facility);
  commoditiesArray.forEach((commodity) => {
    if (facility.cp.storage.quota[commodity]) {
      addStorage(
        facility!.cp.storage,
        commodity,
        Math.floor(facility.cp.storage.quota[commodity] * random(0.4, 0.7))
      );
    }
  });
}

function getSectorPosition(sector: Sector): Position2D {
  const sectorPosition = hecsToCartesian(
    sector.cp.hecsPosition.value,
    sectorSize / 10
  );

  let position: Position2D;
  let isNearAnyFacility: boolean;

  do {
    position = add(sectorPosition, [
      random(-sectorSize / 20, sectorSize / 20),
      random(-sectorSize / 20, sectorSize / 20),
    ]) as Position2D;

    isNearAnyFacility = sector.sim.queries.facilities
      .get()
      .filter((facility) => facility.cp.position.sector === sector.id)
      .some((facility) => distance(facility.cp.position.coord, position) < 10);
  } while (isNearAnyFacility);

  return position;
}

export class FacilityPlanningSystem extends System<"plan"> {
  apply = (sim: Sim) => {
    super.apply(sim);

    sim.hooks.phase.update.tap(this.constructor.name, this.exec);
  };

  planMiningFacilities = (sector: Sector, faction: Faction): void => {
    const resources = getSectorResources(sector, 1);
    const facilities = this.sim.queries.facilityWithProduction
      .get()
      .filter(
        (facility) =>
          facility.cp.owner?.id === faction.id &&
          facility.cp.position.sector === sector.id
      );
    const resourceUsageInFacilities = getResourceUsage(facilities);
    const factionBlueprints = Object.values(facilityModules).filter((f) =>
      faction.cp.blueprints.facilityModules.find((fm) => fm.slug === f.slug)
    );

    perCommodity((commodity) => {
      const facilityModule = factionBlueprints
        .filter(discriminate("type", "production"))
        .find((fm) => fm.pac?.[commodity]?.consumes);
      const canBeMined =
        resources[commodity].max > 0 &&
        resourceUsageInFacilities[commodity] === 0 &&
        !!facilityModule;

      if (!canBeMined) {
        return;
      }

      const facility = createFacility(this.sim, {
        owner: faction,
        position: getSectorPosition(sector),
        sector,
      });
      facility.cp.name.value = createFacilityName(facility, "Mining Complex");
      facility.addComponent(createCompoundProduction());
      facility.cp.render.texture = "fMin";

      for (
        let i = 0;
        i <
          resources[commodity].max /
            ((10000 * facilityModule.pac![commodity]!.consumes) / 3600) &&
        i < 8;
        i++
      ) {
        addFacilityModule(
          facility,
          facilityModules.containerMedium.create(this.sim, facility)
        );
        addFacilityModule(facility, facilityModule.create(this.sim, facility));
      }

      addFacilityModule(
        facility,
        facilityModules.smallDefense.create(this.sim, facility)
      );
      addStartingCommodities(facility);
    });
  };

  planHabitats = (faction: Faction): void => {
    this.sim.queries.sectors
      .get()
      .filter((sector) => sector.cp.owner?.id === faction.id)
      .forEach((sector) => {
        const sectorPosition = hecsToCartesian(
          sector.cp.hecsPosition.value,
          sectorSize / 10
        );

        const facility = createFacility(this.sim, {
          owner: faction,
          position: add(sectorPosition, [
            random(-sectorSize / 20, sectorSize / 20),
            random(-sectorSize / 20, sectorSize / 20),
          ]) as Position2D,
          sector,
        });
        facility.cp.render.texture = "fCiv";
        facility.cp.name.value = createFacilityName(facility, "Habitat");
        facility.addComponent(createCompoundProduction());

        addFacilityModule(
          facility,
          facilityModules.containerSmall.create(this.sim, facility)
        );
        addFacilityModule(
          facility,
          facilityModules.habitat.create(this.sim, facility)
        );
        if (Math.random() < 0.2) {
          addFacilityModule(
            facility,
            facilityModules.smallDefense.create(this.sim, facility)
          );
        }

        addStartingCommodities(facility);
        addFacilityModule(
          facility,
          facilityModules.smallDefense.create(this.sim, facility)
        );
      });
  };

  planFactories = (faction: Faction): void => {
    const modulesToBuild: Array<
      (typeof facilityModules)[keyof typeof facilityModules]
    > = [];
    this.sim.queries.facilityWithProduction.reset();
    const facilities = this.sim.queries.facilityWithProduction
      .get()
      .filter((facility) => facility.cp.owner?.id === faction.id);
    const resourceUsageInFacilities = getResourceUsage(facilities);
    const resourcesProducedByFacilities = getResourceProduction(facilities);
    const factionBlueprints = Object.values(facilityModules).filter((f) =>
      faction.cp.blueprints.facilityModules.find((fm) => fm.slug === f.slug)
    );
    const factoryModules = factionBlueprints.filter(
      discriminate("type", "production")
    );

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const productionModule = factoryModules.find(
        (facilityModule) =>
          facilityModule.pac &&
          isAbleToBuild(
            facilityModule.pac,
            resourcesProducedByFacilities,
            resourceUsageInFacilities,
            faction.cp.ai!.stockpiling
          )
      );
      if (!productionModule) break;
      modulesToBuild.push(productionModule);
      commoditiesArray.forEach((commodity) => {
        if (productionModule.pac && productionModule.pac[commodity]?.consumes) {
          resourceUsageInFacilities[commodity] +=
            productionModule.pac![commodity]!.consumes;
        }

        if (productionModule.pac && productionModule.pac[commodity]?.produces) {
          resourcesProducedByFacilities[commodity] +=
            productionModule.pac![commodity]!.produces;
        }
      });
    }

    let facility: Facility | undefined;

    const buildQueue = shuffle(modulesToBuild);
    while (buildQueue.length > 0) {
      if (
        !facility ||
        Math.random() > 0.7 ||
        facility.cp.modules.ids.length > 6
      ) {
        if (facility && this.sim.getTime() === 0) {
          addStartingCommodities(facility);
        }

        const sector = pickRandom(
          this.sim.queries.sectors
            .get()
            .filter((s) => s.cp.owner?.id === faction.id)
        );
        const sectorPosition = hecsToCartesian(
          sector.cp.hecsPosition.value,
          sectorSize / 10
        );

        facility = createFacility(this.sim, {
          owner: faction,
          position: add(sectorPosition, [
            random(-sectorSize / 20, sectorSize / 20),
            random(-sectorSize / 20, sectorSize / 20),
          ]) as Position2D,
          sector,
        });
        facility.cp.name.value = createFacilityName(facility, "Factory");
        facility.addComponent(createCompoundProduction());
        addFacilityModule(
          facility,
          facilityModules.smallDefense.create(this.sim, facility)
        );
      }

      const facilityModule = buildQueue.pop()!;

      addFacilityModule(
        facility,
        facilityModules.containerSmall.create(this.sim, facility)
      );
      addFacilityModule(facility, facilityModule.create(this.sim, facility));
    }

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`Faction ${faction.cp.name.slug}`);
      // eslint-disable-next-line no-console
      console.table(
        perCommodity((commodity) => ({
          produced: resourcesProducedByFacilities[commodity],
          consumed: resourceUsageInFacilities[commodity],
          balance:
            resourcesProducedByFacilities[commodity] -
            resourceUsageInFacilities[commodity],
        }))
      );
    }
  };

  exec = (): void => {
    // TODO: remove time limitation after introducing station builders
    if (this.cooldowns.canUse("plan") && this.sim.getTime() === 0) {
      this.cooldowns.use("plan", 500);

      this.sim.queries.ai.get().forEach((faction) => {
        this.sim.queries.sectors
          .get()
          .filter((sector) => sector.cp.owner?.id === faction.id)
          .forEach((sector) => {
            this.planMiningFacilities(sector, faction);
          });

        this.planHabitats(faction);
        this.planFactories(faction);
      });
    }
  };
}
