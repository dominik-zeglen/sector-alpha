import type { FacilityModuleType } from "./archetypes/facilityModule";
import type { ShipRole } from "./world/ships";
import { shipRoles } from "./world/ships";
import modules from "./world/data/facilityModules.json";

const tags = [
  "player",
  "selection",
  "ship",
  "sector",
  "facility",
  "facilityModule",
  "asteroid",
  "virtual",
  "collectible",
  "gateway",
  "discovered",
  "mainQuestStarted",
  "busy",
  "ai:attack-force",
  "ai:spare",
  "ai:mission",
  "ui:arrow",
  ...shipRoles.map<`role:${ShipRole}`>((role) => `role:${role}`),
  ...modules.map<`facilityModuleType:${FacilityModuleType}`>(
    ({ type: facilityModuleType }) =>
      `facilityModuleType:${facilityModuleType as FacilityModuleType}`
  ),
] as const;

export type EntityTag = (typeof tags)[number];
export const EntityTags = tags.reduce(
  (obj, key) => ({
    ...obj,
    [key]: key,
  }),
  {} as Record<EntityTag, string>
);
