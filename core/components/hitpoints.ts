import type { RequireComponent } from "@core/tsHelpers";
import type { BaseComponent } from "./component";

export interface HitPoints extends BaseComponent<"hitpoints"> {
  hp: {
    max: number;
    value: number;
    regen: number;
  };
  shield?: {
    max: number;
    value: number;
    regen: number;
  };
  hit?: boolean;
}

export function changeHp(
  entity: RequireComponent<"hitpoints">,
  value: number
): void {
  let delta = value;
  if (entity.cp.hitpoints.shield?.value) {
    entity.cp.hitpoints.shield.value = Math.max(
      0,
      entity.cp.hitpoints.shield.value - delta
    );
    delta -= Math.min(entity.cp.hitpoints.shield.value, value);
  }

  entity.cp.hitpoints.hp.value -= delta;
  entity.cp.hitpoints.hit = true;
}
