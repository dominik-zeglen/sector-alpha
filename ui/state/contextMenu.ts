import type { Sector } from "@core/archetypes/sector";
import type { Entity } from "@core/entity";
import { useMobx } from "@ui/hooks/useMobx";
import { action, computed, makeObservable, observable } from "mobx";
import { Vec2 } from "ogl";

export class ContextMenuStore {
  active = false;
  position = new Vec2(0, 0);
  worldPosition = new Vec2(0, 0);
  sector: Sector | null = null;
  target: Entity | null = null;

  constructor() {
    makeObservable(this, {
      active: observable,
      position: observable,
      worldPosition: observable,
      sector: observable,
      target: observable,
      state: computed,
      open: action.bound,
      close: action.bound,
    });
  }

  open({
    position,
    sector,
    target,
    worldPosition,
  }: {
    position: Vec2;
    worldPosition: Vec2;
    sector: Sector | null;
    target?: Entity | null;
  }) {
    this.active = true;
    this.position = position;
    this.worldPosition = worldPosition;
    this.sector = sector;
    this.target = target ?? null;
  }

  close() {
    this.active = false;
  }

  get state() {
    return {
      active: this.active,
      position: this.position,
      worldPosition: this.worldPosition,
      sector: this.sector,
      target: this.target,
    };
  }
}

export const contextMenuStore = new ContextMenuStore();
export const useContextMenuStore = <TResult extends Array<any>>(
  selector: (_store: ContextMenuStore) => TResult
) => useMobx(contextMenuStore, selector);
