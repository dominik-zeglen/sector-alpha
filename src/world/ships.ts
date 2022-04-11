import { matrix } from "mathjs";
import { InitialShipInput } from "../entities/ship";

export const shipClasses: Record<
  "shipA" | "shipB" | "minerA" | "minerB",
  InitialShipInput
> = {
  shipA: {
    name: "Ship Type A",
    position: matrix([0, 0]),
    speed: 1,
    storage: 10,
    mining: 0,
  },
  shipB: {
    name: "Ship Type B",
    position: matrix([0, 0]),
    speed: 1.3,
    storage: 6,
    mining: 0,
  },

  minerA: {
    name: "Mining Ship Type A",
    position: matrix([0, 0]),
    speed: 0.7,
    storage: 40,
    mining: 1,
  },
  minerB: {
    name: "Mining Ship Type B",
    position: matrix([0, 0]),
    speed: 1.1,
    storage: 24,
    mining: 1.3,
  },
};
