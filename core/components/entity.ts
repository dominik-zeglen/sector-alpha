import "reflect-metadata";
import { Expose, Exclude, Type } from "class-transformer";
import omit from "lodash/omit";
import reduce from "lodash/reduce";
import pick from "lodash/pick";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import { MissingComponentError } from "../errors";
import { Cooldowns } from "../utils/cooldowns";
import type { CoreComponents } from "./component";

export class EntityComponents {
  toJSON() {
    return reduce(
      Object.keys(this),
      (acc, key) => ({
        ...acc,
        [key]: omit(this[key], ["sim", "g", "sprite"]),
      }),
      {}
    );
  }
}

@Exclude()
export class Entity {
  @Expose()
  components = new EntityComponents() as Partial<CoreComponents>;
  @Expose()
  @Type(() => Cooldowns)
  cooldowns = new Cooldowns<string>();
  @Expose()
  tags: Set<string>;
  @Expose()
  id: number;
  sim: Sim;
  deleted: boolean = false;

  constructor(sim?: Sim) {
    if (sim) {
      this.sim = sim;
      sim.registerEntity(this);
    }
  }

  get cp(): Partial<CoreComponents> {
    return this.components;
  }

  hasComponents(components: Readonly<Array<keyof CoreComponents>>): boolean {
    return components.every((name) => !!this.components[name]);
  }

  requireComponents<T extends keyof CoreComponents>(
    components: Readonly<T[]>
  ): RequireComponent<T> {
    if (!components.every((name) => !!this.components[name])) {
      throw new MissingComponentError(this, components);
    }

    return this as unknown as RequireComponent<T>;
  }

  addComponent<T extends keyof CoreComponents>(
    component: CoreComponents[T]
  ): Entity {
    const componentName: CoreComponents[T]["name"] = component.name;
    this.components[componentName] = component;
    this.sim.hooks.addComponent.call({
      entity: this,
      component: component.name,
    });

    return this;
  }

  removeComponent(name: keyof CoreComponents): Entity {
    delete this.components[name];
    this.sim.hooks.removeComponent.call({ entity: this, component: name });

    return this;
  }

  unregister() {
    this.deleted = true;
    this.sim.unregisterEntity(this);
  }

  toJSON() {
    return pick(this, ["components", "cooldowns", "id"]);
  }
}

export class PureEntity {
  components = new EntityComponents() as Partial<CoreComponents>;
  cooldowns = new Cooldowns<string>();
  tags: Set<string>;
  id: number;

  get cp(): Partial<CoreComponents> {
    return this.components;
  }
}
