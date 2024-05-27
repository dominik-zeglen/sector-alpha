/* eslint-disable no-bitwise */
import type { CoreComponents } from "./component";

export const componentMask: Record<keyof CoreComponents, bigint> = [
  "ai",
  "asteroidSpawn",
  "autoOrder",
  "blueprints",
  "budget",
  "builder",
  "camera",
  "children",
  "color",
  "commander",
  "compoundProduction",
  "creationDate",
  "damage",
  "deployable",
  "disposable",
  "dockable",
  "docks",
  "drive",
  "facilityModuleQueue",
  "hecsPosition",
  "hitpoints",
  "inflationStats",
  "journal",
  "minable",
  "mining",
  "missions",
  "model",
  "orders",
  "relations",
  "renderGraphics",
  "sectorStats",
  "shipyard",
  "subordinates",
  "systemManager",
  "teleport",
  "trade",
  "modules",
  "name",
  "owner",
  "parent",
  "production",
  "position",
  "render",
  "selectionManager",
  "simpleCommodityStorage",
  "storage",
  "facilityModuleBonus",
  "crew",
  "crewRequirement",
  "movable",
  "storageTransfer",
].reduce(
  (acc, component, index) => ({
    ...acc,
    [component]: BigInt(1) << BigInt(index),
  }),
  {} as Record<keyof CoreComponents, bigint>
);
