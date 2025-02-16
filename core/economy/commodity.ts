import type { Values } from "../tsHelpers";

export const commodities = [
  "coolant",
  "drones",
  "electronics",
  "engineParts",
  "food",
  "fuel",
  "fuelium",
  "gold",
  "goldOre",
  "hullPlates",
  "hydrogen",
  "ice",
  "metals",
  "ore",
  "silica",
  "silicon",
  "superconductors",
  "tauMetal",
  "water",
] as const;
export type Commodity = (typeof commodities)[number];
export const commoditiesArray = commodities as unknown as Commodity[];

export const mineableCommodities = {
  fuelium: "fuelium",
  goldOre: "goldOre",
  ice: "ice",
  ore: "ore",
  silica: "silica",
} as const;
export type MineableCommodity = Values<typeof mineableCommodities>;
export const mineableCommoditiesArray = Object.values(
  mineableCommodities
) as MineableCommodity[];

export const commodityLabel: Record<Commodity, string> = {
  coolant: "Coolant",
  drones: "Drones",
  electronics: "Electronics",
  engineParts: "Engine parts",
  food: "Food",
  fuel: "Fuel",
  fuelium: "Fuelium",
  gold: "Gold",
  goldOre: "Gold ore",
  hullPlates: "Hull plates",
  hydrogen: "Hydrogen",
  ice: "Ice",
  metals: "Metals",
  ore: "Ore",
  silica: "Silica",
  silicon: "Silicon",
  superconductors: "Superconductors",
  tauMetal: "Tau-Metal",
  water: "Water",
};
