import type { Sector } from "@core/archetypes/sector";
import { useMobx } from "@ui/hooks/useMobx";
import { action, makeObservable, observable } from "mobx";

export class StrategicMapStore {
  selected: Sector | null = null;

  constructor() {
    makeObservable(this, {
      selected: observable,
      selectSector: action.bound,
      unselectSector: action.bound,
    });
  }

  selectSector(sector: Sector) {
    if (this.selected !== sector) {
      this.selected = sector;
    }
  }

  unselectSector() {
    this.selected = null;
  }
}

export const strategicMapStore = new StrategicMapStore();
export const useStrategicMapStore = <TResult extends Array<any>>(
  selector: (_store: StrategicMapStore) => TResult
) => useMobx(strategicMapStore, selector);
