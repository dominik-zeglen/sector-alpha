import { coreActions } from "./actions/core";
import type { DevAction } from "./actions/types";
import { isHeadless } from "./settings";
import type { Sim } from "./sim";

export class ActionLoader {
  private sim: Sim | null;
  private actions: Array<
    DevAction & {
      /**
       * Origin of the action, used to determine where the action was loaded from
       */
      origin: string;
    }
  >;

  constructor() {
    this.actions = [];

    if (!isHeadless) {
      window.cheats = {};
    }

    for (const action of coreActions) {
      this.register(action, "core");
    }
  }

  all() {
    return this.actions;
  }

  link(sim: Sim) {
    this.sim = sim;
  }

  reset() {
    this.actions = [];
    this.sim = null;
    window.cheats = undefined!;
  }

  register(action: DevAction, origin: string) {
    if (
      this.actions.some(
        ({ category, slug }) =>
          slug === action.slug && category === action.category
      )
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `Action ${action.category}.${action.slug} submitted by ${origin} already exists; overriding.`
      );
    }
    this.actions.push({ ...action, origin });
    if (!isHeadless) {
      window.cheats ??= {};
      if (!window.cheats[action.category]) {
        window.cheats[action.category] = {};
      }

      window.cheats[action.category][action.slug] = (...args) =>
        // @ts-expect-error
        action.fn(this.sim, ...args);
    }
  }
}

export const actionLoader = new ActionLoader();
