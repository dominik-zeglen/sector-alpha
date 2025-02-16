import type { CoreComponents } from "@core/components/component";
import type { EntityTag } from "@core/tags";
import type { RequireComponent } from "@core/tsHelpers";
import { Observable } from "@core/utils/observer";
import { flatMap, keys, pipe } from "@fxts/core";
import type { Sim } from "@core/sim";
import type { Entity } from "@core/entity";
import type { IndexEntities } from "./entityIndex";
import { BaseEntityIndex } from "./entityIndex";

export class IndexNotAppliedError extends Error {
  constructor() {
    super("Index not applied to the sim");
  }
}

const hook = new Observable<{
  oldSectorId: number;
  newSectorId: number;
  entity: RequireComponent<"position">;
}>("sectorIndex");

export class SectorIndex<
  T extends keyof CoreComponents
> extends BaseEntityIndex<T | "position"> {
  sectors: Record<number, Set<RequireComponent<T | "position">>>;

  constructor(
    requiredComponents: readonly T[],
    requiredTags: readonly EntityTag[] = []
  ) {
    super([...requiredComponents, "position"], requiredTags);
    this.sectors = {};
  }

  apply(sim: Sim): void {
    super.apply(sim);
    this.enableHooks();

    hook.subscribe(this.constructor.name, this.changePosition);
    this.hooks.add.subscribe(this.constructor.name, (entity) => {
      this.addToSector(entity.cp.position.sector, entity);
    });
    this.hooks.remove.subscribe(this.constructor.name, ({ entity }) => {
      this.removeFromSector(entity);
    });

    this.collect();
  }

  all = (): IterableIterator<RequireComponent<T>> => {
    if (!this.sim) {
      throw new IndexNotAppliedError();
    }

    return pipe(
      this.sectors,
      keys,
      flatMap((sector) => this.get(sector))
    );
  };

  changePosition = ({
    entity,
    newSectorId,
    oldSectorId,
  }: {
    oldSectorId: number;
    newSectorId: number;
    entity: RequireComponent<T | "position">;
  }) => {
    if (oldSectorId !== newSectorId && this.canBeAdded(entity)) {
      this.removeFromSector(entity, oldSectorId);
      this.addToSector(newSectorId, entity);
    }
  };

  addToSector = (sector: number, entity: RequireComponent<T | "position">) => {
    this.sectors[sector] ??= new Set();
    this.sectors[sector].add(entity);
  };

  removeFromSector = (entity: Entity, sector?: number) => {
    if (sector && !this.sectors[sector]) return;

    if (sector) {
      this.sectors[sector].delete(entity as any);
    } else {
      for (const sectorId of Object.keys(this.sectors)) {
        this.sectors[sectorId].delete(entity);
      }
    }
  };

  get = (sectorId: number): IndexEntities<T> => {
    if (!this.sim) {
      throw new IndexNotAppliedError();
    }

    return this.sectors[sectorId] ? [...this.sectors[sectorId]] : [];
  };

  getIt = (sectorId: number): IterableIterator<RequireComponent<T>> => {
    if (!this.sim) {
      throw new IndexNotAppliedError();
    }

    return (this.sectors[sectorId] ?? []).values();
  };

  getSectors = () => {
    if (!this.sim) {
      throw new IndexNotAppliedError();
    }

    return Object.keys(this.sectors).map(Number);
  };

  clear = () => {
    this.sectors = {};
  };

  reset = () => {
    this.sim = null;
    this.clear();
  };

  static notify(
    oldSectorId: number,
    newSectorId: number,
    entity: RequireComponent<"position">
  ) {
    hook.notify({ oldSectorId, newSectorId, entity });
  }
}
