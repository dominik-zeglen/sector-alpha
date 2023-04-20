import type { Mission } from "@core/components/missions";
import type { Sim } from "@core/sim";

export interface MissionHandler {
  isCompleted: (_mission: Mission) => boolean;
  isFailed: (_mission: Mission) => boolean;
  generate: (_sim: Sim) => void;
  update: (_mission: Mission, _sim: Sim) => void;
}
