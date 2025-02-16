import type { DockSize } from "../components/dockable";
import type { ShipDriveProps } from "../components/drive";
import type { Textures } from "../components/render";
import type { Commodity } from "../economy/commodity";
import shipClassesData from "./data/ships.json";

export const shipRoles = [
  "transport",
  "mining",
  "military",
  "building",
  "storage",
] as const;
export type ShipRole = (typeof shipRoles)[number];

export interface ShipBuildInput {
  time: number;
  cost: Partial<Record<Commodity, number>>;
}

export interface ShipInput extends ShipDriveProps {
  build: ShipBuildInput;
  damage: {
    cooldown: number;
    value: number;
    range: number;
    angle: number;
  };
  hitpoints: {
    hp: { value: number; regen: number };
    shield: { value: number; regen: number };
  };
  name: string;
  slug: string;
  storage: number;
  mining: number;
  texture: keyof Textures;
  size: DockSize;
  role: ShipRole;
}

export const shipClasses = shipClassesData.map((s) => ({
  ...s,
  damage: {
    ...s.damage,
    angle: s.damage.angle,
  },
})) as ShipInput[];
