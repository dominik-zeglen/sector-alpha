import shuffle from "lodash/shuffle";
import { add, matrix, random, Matrix } from "mathjs";
import { createFacility, Facility } from "../archetypes/facility";
import { facilityModules } from "../archetypes/facilityModule";
import { Faction } from "../archetypes/faction";
import { Sector, sectorSize } from "../archetypes/sector";
import { hecsToCartesian } from "../components/hecsPosition";
import { mineableCommodities } from "../economy/commodity";
import { Sim } from "../sim";
import { Cooldowns } from "../utils/cooldowns";
import { addFacilityModule } from "../utils/entityModules";
import { pickRandom } from "../utils/generators";
import { perCommodity } from "../utils/perCommodity";
import {
  getResourceProduction,
  getResourceUsage,
  getSectorResources,
} from "../utils/resources";
import { System } from "./system";

export class FacilityPlanningSystem extends System {
  cooldowns: Cooldowns<"plan">;

  constructor(sim: Sim) {
    super(sim);
    this.cooldowns = new Cooldowns("plan");
  }

  planMiningFacilities = (sector: Sector, faction: Faction): void => {
    const resources = getSectorResources(sector);
    const facilities = this.sim.queries.facilityWithProduction
      .get()
      .filter(
        (facility) =>
          facility.cp.owner?.id === faction.id &&
          facility.cp.position.sector === sector.id
      );
    const resourceUsageInFacilities = getResourceUsage(facilities);
    const sectorPosition = hecsToCartesian(
      sector.cp.hecsPosition.value,
      sectorSize / 10
    );

    perCommodity((commodity) => {
      const canBeMined =
        resources[commodity].max > 0 &&
        resourceUsageInFacilities[commodity] === 0;

      if (!canBeMined) {
        return;
      }

      const facility = createFacility(this.sim, {
        owner: faction,
        position: add(
          sectorPosition,
          matrix([
            random(-sectorSize / 20, sectorSize / 20),
            random(-sectorSize / 20, sectorSize / 20),
          ])
        ) as Matrix,
        sector,
      });

      const facilityModule = Object.values(facilityModules).find(
        (fm) => fm.pac && fm.pac[commodity]?.consumes
      )!;
      for (
        let i = 0;
        i <
        resources[commodity].max /
          ((10000 * facilityModule.pac![commodity]!.consumes) /
            facilityModule.time!);
        i++
      ) {
        addFacilityModule(
          facility,
          facilityModules.containerSmall.create(this.sim, facility)
        );
        addFacilityModule(facility, facilityModule.create(this.sim, facility));
      }
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
          position: add(
            sectorPosition,
            matrix([
              random(-sectorSize / 20, sectorSize / 20),
              random(-sectorSize / 20, sectorSize / 20),
            ])
          ) as Matrix,
          sector,
        });

        addFacilityModule(
          facility,
          facilityModules.containerSmall.create(this.sim, facility)
        );
        addFacilityModule(
          facility,
          facilityModules.habitat.create(this.sim, facility)
        );
      });
  };

  planFactories = (faction: Faction): void => {
    const modulesToBuild: Array<
      typeof facilityModules[keyof typeof facilityModules]
    > = [];
    this.sim.queries.facilityWithProduction.reset();
    const facilities = this.sim.queries.facilityWithProduction
      .get()
      .filter((facility) => facility.cp.owner?.id === faction.id);
    const resourceUsageInFacilities = getResourceUsage(facilities);
    const resourcesProducedByFacilities = getResourceProduction(facilities);
    const factoryModules = Object.values(facilityModules).filter(
      (fm) => fm !== facilityModules.habitat
    );

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const productionModule = factoryModules.find(
        (facilityModule) =>
          facilityModule.pac &&
          Object.entries(facilityModule.pac).every(
            ([commodity, { consumes, produces }]) =>
              produces
                ? !Object.values<string>(mineableCommodities).includes(
                    commodity
                  )
                : (consumes / facilityModule.time! +
                    resourceUsageInFacilities[commodity]) /
                    resourcesProducedByFacilities[commodity] <
                  faction.cp.ai!.stockpiling
          )
      );
      if (!productionModule) break;
      modulesToBuild.push(productionModule);
      perCommodity((commodity) => {
        if (productionModule.pac && productionModule.pac[commodity]?.consumes) {
          resourceUsageInFacilities[commodity] +=
            productionModule.pac![commodity]!.consumes / productionModule.time!;
        }

        if (productionModule.pac && productionModule.pac[commodity]?.produces) {
          resourcesProducedByFacilities[commodity] +=
            productionModule.pac![commodity]!.produces / productionModule.time!;
        }
      });
    }

    let facility: Facility | undefined;

    const buildQueue = shuffle(modulesToBuild);
    while (buildQueue.length > 0) {
      if (!facility || Math.random() > 0.6) {
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
          position: add(
            sectorPosition,
            matrix([
              random(-sectorSize / 20, sectorSize / 20),
              random(-sectorSize / 20, sectorSize / 20),
            ])
          ) as Matrix,
          sector,
        });
      }

      const facilityModule = buildQueue.pop()!;

      addFacilityModule(
        facility,
        facilityModules.containerSmall.create(this.sim, facility)
      );
      addFacilityModule(facility, facilityModule.create(this.sim, facility));
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

        if (faction.cp.ai.type === "territorial") {
          this.planHabitats(faction);
          this.planFactories(faction);
        }
      });
    }
  };
}
