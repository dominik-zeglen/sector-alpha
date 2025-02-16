import { isDev } from "@core/settings";
import { facilityPlanningSystem } from "@core/systems/ai/facilityPlanning";
import { militaryModuleSpottingSystem } from "@core/systems/ai/militaryModuleSpotting";
import { orderPlanningSystem } from "@core/systems/ai/orderPlanning";
import { shipPlanningSystem } from "@core/systems/ai/shipPlanning";
import { shipReturningSystem } from "@core/systems/ai/shipReturning";
import { spottingSystem } from "@core/systems/ai/spotting";
import { tauHarassingSystem } from "@core/systems/ai/tauHarassing";
import { asteroidSpawningSystem } from "@core/systems/asteroidSpawning";
import { attackingSystem } from "@core/systems/attacking";
import { budgetPlanningSystem } from "@core/systems/budgetPlanning";
import { collectibleUnregisteringSystem } from "@core/systems/collectibleUnregistering";
import { cooldownUpdatingSystem } from "@core/systems/cooldowns";
import { crewGrowingSystem } from "@core/systems/crewGrowing";
import { deadUnregisteringSystem } from "@core/systems/deadUnregistering";
import { disposableUnregisteringSystem } from "@core/systems/disposableUnregistering";
import { facilityBuildingSystem } from "@core/systems/facilityBuilding";
import { hitpointsRegeneratingSystem } from "@core/systems/hitpointsRegenerating";
import { inflationStatisticGatheringSystem } from "@core/systems/inflationStatisticGathering";
import { miningSystem } from "@core/systems/mining";
import { movingSystem } from "@core/systems/moving";
import { navigatingSystem } from "@core/systems/navigating";
import { orderExecutingSystem } from "@core/systems/orderExecuting/orderExecuting";
import { pathPlanningSystem } from "@core/systems/pathPlanning";
import { pirateSpawningSystem } from "@core/systems/pirateSpawning";
import { producingSystem } from "@core/systems/producing";
import { AvgFrameReportingSystem } from "@core/systems/reporting/avgFrameReporting";
import { sectorStatisticGatheringSystem } from "@core/systems/sectorStatisticGathering";
import { shipBuildingSystem } from "@core/systems/shipBuilding";
import { storageQuotaPlanningSystem } from "@core/systems/storageQuotaPlanning";
import { tradingSystem } from "@core/systems/trading";
import { undeployingSystem } from "@core/systems/undeploying";
import { fogOfWarUpdatingSystem } from "@core/systems/fogOfWarUpdating";
import { storageTransferringSystem } from "@core/systems/storageTransferring";
import { sectorClaimingSystem } from "@core/systems/sectorClaiming";
import type { SimConfig } from "./Sim";

export const bootstrapSystems = [
  pathPlanningSystem,
  cooldownUpdatingSystem,
  producingSystem,
  storageQuotaPlanningSystem,
  tradingSystem,
  budgetPlanningSystem,
  orderPlanningSystem,
  navigatingSystem,
  movingSystem,
  miningSystem,
  orderExecutingSystem,
  asteroidSpawningSystem,
  facilityPlanningSystem,
  shipPlanningSystem,
  sectorStatisticGatheringSystem,
  inflationStatisticGatheringSystem,
  shipBuildingSystem,
  facilityBuildingSystem,
  shipReturningSystem,
  disposableUnregisteringSystem,
  crewGrowingSystem,
  storageTransferringSystem,
];

export const createBaseConfig = async (): Promise<SimConfig> => {
  const { missionSystem } = await import("@core/systems/mission/mission");
  const config: SimConfig = {
    systems: [
      ...bootstrapSystems,
      undeployingSystem,
      attackingSystem,
      spottingSystem,
      militaryModuleSpottingSystem,
      hitpointsRegeneratingSystem,
      tauHarassingSystem,
      deadUnregisteringSystem,
      collectibleUnregisteringSystem,
      missionSystem,
      pirateSpawningSystem,
      fogOfWarUpdatingSystem,
      sectorClaimingSystem,
    ],
  };

  if (isDev) {
    config.systems.push(new AvgFrameReportingSystem());
  }

  return config;
};
