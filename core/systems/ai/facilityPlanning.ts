import type { Position } from "@core/components/position";
import { isDev } from "@core/settings";
import type { RequireComponent } from "@core/tsHelpers";
import { discriminate } from "@core/utils/maps";
import shuffle from "lodash/shuffle";
import { random } from "mathjs";
import keyBy from "lodash/keyBy";
import type { Vec2 } from "ogl";
import { fromPolar } from "@core/utils/misc";
import type { Facility } from "../../archetypes/facility";
import { createFacilityName, createFacility } from "../../archetypes/facility";
import { facilityModules } from "../../archetypes/facilityModule";
import type { Faction } from "../../archetypes/faction";
import type { Sector } from "../../archetypes/sector";
import { sectorSize } from "../../archetypes/sector";
import type { PAC } from "../../components/production";
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
import { maxFacilityModules } from "../facilityBuilding";
import { settleStorageQuota } from "../storageQuotaPlanning";
import { System } from "../system";
import facilityTemplatesData from "../../world/data/facilityTemplates.json";

const facilityTemplates = keyBy(facilityTemplatesData, "slug");

function createFacilityFromTemplate(
  template: string,
  sim: Sim,
  input: { owner: Faction; position: Pick<Position, "sector" | "coord"> }
) {
  const facility = createFacility(sim, {
    owner: input.owner,
    position: input.position.coord,
    sector: sim.getOrThrow(input.position.sector),
  });
  facility.cp.name.value = createFacilityName(
    facility,
    facilityTemplates[template].name
  );

  for (const m of facilityTemplates[template].modules) {
    addFacilityModule(facility, facilityModules[m].create(sim, facility));
  }

  return facility;
}

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

function getSectorPosition(
  sector: Sector,
  radius?: number,
  point?: Vec2
): Vec2 {
  let position: Vec2;
  let isNearAnyFacility: boolean;
  const r = radius ?? -sectorSize / 20;

  do {
    position = fromPolar(random(0, 2 * Math.PI), random(0, r));
    if (point) {
      position.add(point);
    }

    isNearAnyFacility = sector.sim.index.facilities
      .get()
      .filter((facility) => facility.cp.position.sector === sector.id)
      .some((facility) => facility.cp.position.coord.distance(position) < 10);
  } while (isNearAnyFacility);

  return position;
}

export class FacilityPlanningSystem extends System<"plan"> {
  apply = (sim: Sim) => {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  createNewFactory = (faction: Faction): Facility => {
    const sector = pickRandom(
      this.sim.index.sectors.get().filter((s) => s.cp.owner?.id === faction.id)
    );
    const facility = createFacility(this.sim, {
      owner: faction,
      position: fromPolar(random(0, 2 * Math.PI), random(0, sectorSize / 20)),
      sector,
    });
    facility.cp.name.value = createFacilityName(facility, "Factory");
    addFacilityModule(
      facility,
      facilityModules.basicHabitat.create(this.sim, facility)
    );
    addFacilityModule(
      facility,
      facilityModules.basicStorage.create(this.sim, facility)
    );
    addFacilityModule(
      facility,
      facilityModules.smallDefense.create(this.sim, facility)
    );
    for (let i = 0; i < 3; i++) {
      addFacilityModule(
        facility,
        facilityModules.containerLarge.create(this.sim, facility)
      );
    }

    if (facility.hasComponents(["crew"])) {
      facility.cp.crew.workers.current = facility.cp.crew.workers.max * 0.7;
    }

    return facility;
  };

  planMiningFacilities = (sector: Sector, faction: Faction): void => {
    const resources = getSectorResources(sector, 0);
    const factionBlueprints = Object.values(facilityModules).filter((f) =>
      faction.cp.blueprints.facilityModules.find((fm) => fm.slug === f.slug)
    );

    perCommodity((commodity) => {
      const facilityModule = factionBlueprints
        .filter(discriminate("type", "production"))
        .find((fm) => fm.pac?.[commodity]?.consumes);
      const canBeMined = resources[commodity].max > 0 && !!facilityModule;

      if (!canBeMined) {
        return;
      }

      const minableField = this.sim.index.asteroidFields
        .get()
        .find(
          (af) =>
            af.cp.asteroidSpawn.type === commodity &&
            af.cp.position.sector === sector.id
        );
      const facility = createFacility(this.sim, {
        owner: faction,
        position: getSectorPosition(
          sector,
          10,
          minableField?.cp.position.coord
        ),
        sector,
      });
      addFacilityModule(
        facility,
        facilityModules.basicHabitat.create(this.sim, facility)
      );
      addFacilityModule(
        facility,
        facilityModules.basicStorage.create(this.sim, facility)
      );
      facility.cp.name.value = createFacilityName(facility, "Mining Complex");
      facility.cp.render.texture = "fMin";
      if (facility.hasComponents(["crew"])) {
        facility.cp.crew.workers.current = facility.cp.crew.workers.max * 0.7;
      }

      for (
        let i = 0;
        i <
          resources[commodity].max /
            ((10000 * facilityModule.pac![commodity]!.consumes) / 3600) &&
        i < maxFacilityModules / 2 - 2;
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

  planHubs = (faction: Faction): void => {
    if (faction.cp.name.slug === "TAU") {
      this.planHives(faction);
      return;
    }

    for (const sector of this.sim.index.sectors.getIt()) {
      if (sector.cp.owner?.id !== faction.id) continue;

      const position = fromPolar(
        random(0, 2 * Math.PI),
        random(0, sectorSize / 50)
      );

      const facility = createFacility(this.sim, {
        owner: faction,
        position,
        sector,
      });
      facility.cp.name.value = createFacilityName(facility, "Hub");
      facility.cp.render.texture = "fHub";
      addFacilityModule(
        facility,
        facilityModules.hub.create(this.sim, facility)
      );
      addFacilityModule(
        facility,
        facilityModules.basicHabitat.create(this.sim, facility)
      );
      addFacilityModule(
        facility,
        facilityModules.containerMedium.create(this.sim, facility)
      );
      for (let i = 0; i < 3; i++) {
        addFacilityModule(
          facility,
          facilityModules.smallDefense.create(this.sim, facility)
        );
      }

      addStartingCommodities(facility);
    }
  };

  planHives = (faction: Faction): void => {
    for (const sector of this.sim.index.sectors.getIt()) {
      if (sector.cp.owner?.id !== faction.id) continue;

      const coord = fromPolar(
        random(0, 2 * Math.PI),
        random(0, sectorSize / 50)
      );

      const hive = createFacilityFromTemplate("outpostHive", this.sim, {
        position: {
          coord,
          sector: sector.id,
        },
        owner: faction,
      });
      hive.cp.render.texture = "fHub";
    }
  };

  planFactories = (faction: Faction): void => {
    const modulesToBuild: Array<
      (typeof facilityModules)[keyof typeof facilityModules]
    > = [];
    this.sim.index.facilityWithProduction.clear();
    this.sim.index.facilityWithProduction.collect();
    const facilities = this.sim.index.facilityWithProduction
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
        Math.random() > 0.8 ||
        facility.cp.modules.ids.length >= maxFacilityModules
      ) {
        if (facility && this.sim.getTime() === 0) {
          addStartingCommodities(facility);
        }

        facility = this.createNewFactory(faction);
      }

      const facilityModule = buildQueue.pop()!;

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

      this.sim.index.ai.get().forEach((faction) => {
        const sectorWithSSF = pickRandom(
          this.sim.index.sectors
            .get()
            .filter((sector) => sector.cp.owner?.id === faction.id)
        );

        if (!sectorWithSSF) return;

        createFacilityFromTemplate("baseFarm", this.sim, {
          position: {
            coord: getSectorPosition(sectorWithSSF),
            sector: sectorWithSSF.id,
          },
          owner: faction,
        });

        this.sim.index.sectors
          .get()
          .filter((sector) => sector.cp.owner?.id === faction.id)
          .forEach((sector) => {
            this.planMiningFacilities(sector, faction);
          });
        this.planHubs(faction);
        this.planFactories(faction);
      });
    }
  };
}

export const facilityPlanningSystem = new FacilityPlanningSystem();
