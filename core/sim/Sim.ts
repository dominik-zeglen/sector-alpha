import "reflect-metadata";
import pick from "lodash/pick";
import { Exclude, Expose, Type, plainToInstance } from "class-transformer";
// For some reason replacer is not exported in types
// @ts-expect-error
import { replacer } from "mathjs";
import type { Path } from "graphlib";

import { filter, pipe, toArray } from "@fxts/core";
import { isHeadless } from "@core/settings";
import type { CoreComponents } from "@core/components/component";
import type { EntityTag } from "@core/tags";
import { componentMask } from "@core/components/masks";
import LZString from "lz-string";
import { Observable } from "@core/utils/observer";
import { defaultIndexer } from "@core/systems/utils/default";
import { Vec2 } from "ogl";
import { isVec2 } from "@core/utils/misc";
import { Entity, EntityComponents } from "../entity";
import { BaseSim } from "./BaseSim";
import type { System } from "../systems/system";
import { MissingEntityError } from "../errors";
import { openDb } from "../db";

export interface SimConfig {
  systems: System[];
}

@Exclude()
export class Sim extends BaseSim {
  delta = 0;

  @Expose()
  entityIdCounter: number = 1;
  hooks: {
    addComponent: Observable<{
      entity: Entity;
      component: keyof CoreComponents;
    }>;
    removeComponent: Observable<{
      entity: Entity;
      component: keyof CoreComponents;
    }>;
    addTag: Observable<{ entity: Entity; tag: EntityTag }>;
    removeTag: Observable<{ entity: Entity; tag: EntityTag }>;
    removeEntity: Observable<Entity>;
    destroy: Observable<void>;

    phase: Record<
      "start" | "init" | "update" | "render" | "cleanup" | "end",
      Observable<number>
    >;
  };

  @Expose()
  @Type(() => Entity)
  entities: Map<number, Entity>;
  index: typeof defaultIndexer;
  paths: Record<string, Record<string, Path>>;

  constructor({ systems }: SimConfig = { systems: [] }) {
    super();

    this.entities = new Map();
    this.hooks = {
      addComponent: new Observable("addComponent"),
      removeComponent: new Observable("removeComponent"),
      addTag: new Observable("addTag"),
      removeTag: new Observable("removeTag"),
      removeEntity: new Observable("removeEntity"),
      destroy: new Observable("destroy"),
      phase: {
        start: new Observable("phase.start", false),
        init: new Observable("phase.init", false),
        update: new Observable("phase.update", false),
        render: new Observable("phase.render", false),
        cleanup: new Observable("phase.cleanup", false),
        end: new Observable("phase.end", false),
      },
    };

    this.index = defaultIndexer;
    for (const index of Object.values(defaultIndexer)) {
      index.apply(this);
    }
    systems.forEach((system) => system.apply(this));
  }

  registerEntity = (entity: Entity) => {
    entity.id = this.entityIdCounter;
    this.entities.set(entity.id, entity);
    this.entityIdCounter += 1;
  };

  unregisterEntity = (entity: Entity) => {
    this.hooks.removeEntity.notify(entity);
    this.entities.delete(entity.id);
  };

  next = (delta: number) => {
    this.delta = delta;

    if (delta === 0) {
      this.updateTimer(delta);
      return;
    }

    this.hooks.phase.start.notify(delta);
    this.hooks.phase.init.notify(delta);
    this.hooks.phase.update.notify(delta);
    this.hooks.phase.render.notify(delta);
    this.hooks.phase.cleanup.notify(delta);
    this.hooks.phase.end.notify(delta);

    this.updateTimer(delta);
  };

  init = () => {
    const settingsEntity = new Entity(this);
    settingsEntity
      .addComponent({
        name: "systemManager",
        lastStatUpdate: 0,
        lastInflationStatUpdate: 0,
      })
      .addComponent({
        name: "inflationStats",
        basketPrices: [],
      })
      .addComponent({
        name: "camera",
        zoom: 1,
        position: new Vec2(0, 0),
      });
  };

  // eslint-disable-next-line no-unused-vars
  find = (cb: (entity: Entity) => boolean): Entity | undefined => {
    for (const [, entity] of this.entities) {
      if (cb(entity)) return entity;
    }

    return undefined;
  };

  // eslint-disable-next-line no-unused-vars
  filter = (cb: (entity: Entity) => boolean): Entity[] =>
    pipe(this.entities.values(), filter(cb), toArray);

  /**
   * Get entity or `undefined`, depending on entity's existence
   * @param id Entity ID
   */
  get = <T extends Entity = Entity>(id: number): T | undefined =>
    this.entities.get(id) as T;

  /**
   * Use it when it should not be possible in any situation to get not existing
   * entity
   * @param id Entity ID
   */
  getOrThrow = <T extends Entity = Entity>(id: number): T => {
    const entity = this.entities.get(id);

    if (!entity) {
      throw new MissingEntityError(id);
    }

    return entity as T;
  };

  destroy = () => {
    this.stop();
    this.hooks.destroy.notify();
    if (!isHeadless) {
      window.sim = undefined!;
      window.selected = undefined!;
    }
  };

  serialize = () => JSON.stringify(this, replacer);

  save = async (name: string, id?: number) => {
    const data = LZString.compress(this.serialize());
    const db = await openDb();

    const tx = db.transaction("saves", "readwrite");
    const os = tx.objectStore("saves");
    if (id) {
      os.put({ id, name, data });
    } else {
      os.add({ name, data });
    }
    tx.commit();

    return tx.done;
  };

  static async deleteSave(id: number) {
    const db = await openDb();

    const tx = db.transaction("saves", "readwrite");
    const os = tx.objectStore("saves");

    os.delete(id);

    tx.commit();

    return tx.done;
  }

  static load(config: SimConfig, data: string) {
    const save = JSON.parse(data, (_k, v) => {
      if (!v) return v;

      if (typeof v === "string" && v.startsWith("BigInt:")) {
        return BigInt(v.split("BigInt:")[1]);
      }
      if (typeof v === "object" && isVec2(v)) {
        const value = new Vec2(...v.value);
        return value;
      }

      return v;
    });

    const sim = plainToInstance(Sim, save);
    const entityMap = new Map();

    sim.entities.forEach((entity) => {
      Object.assign(
        entity.components,
        save.entities.find((e) => e.id === entity.id)!.components
      );
      entityMap.set(entity.id, entity);
      entity.sim = sim;

      entity.components = Object.assign(
        new EntityComponents(),
        entity.components
      );
      entity.componentsMask = Object.keys(entity.components).reduce(
        (mask, cp) => mask | componentMask[cp],
        BigInt(0)
      );
      entity.tags = new Set(entity.tags);
    });

    sim.entities = entityMap;

    for (const index of Object.values(defaultIndexer)) {
      index.apply(sim);
    }
    config.systems.forEach((system) => system.apply(sim));

    return sim;
  }

  static async listSaves() {
    const db = await openDb();

    const tx = db.transaction("saves", "readonly");
    const os = tx.objectStore("saves");
    const results = os.getAll();
    await tx.done;

    return results;
  }

  toJSON() {
    return {
      ...pick(this, ["entityIdCounter", "timeOffset"]),
      entities: [...this.entities].map(([, e]) => e),
    };
  }
}

// Serialization monkeypatches

// eslint-disable-next-line func-names
(BigInt.prototype as any).toJSON = function () {
  return `BigInt:${this.toString()}`;
};

// eslint-disable-next-line func-names
(Vec2.prototype as any).toJSON = function () {
  return { isVec2: true, value: this.toArray() };
};
