import type { Sector } from "@core/archetypes/sector";
import type { RequireComponent } from "@core/tsHelpers";
import { pane } from "@ui/context/Pane";
import { useMobx } from "@ui/hooks/useMobx";
import { action, makeObservable, observable } from "mobx";
import type { FolderApi } from "tweakpane";

export type GameOverlayType = "fleet" | "missions" | "map" | "dev" | null;
export type Selectable = RequireComponent<"position">;

export class GameStore {
  selectionBox: boolean = false;
  sector: Sector = undefined!;
  selectedUnits: Selectable[] = [];
  focused = false;
  overlay: GameOverlayType = null;

  paneFolder: FolderApi | null;

  constructor() {
    makeObservable(this, {
      sector: observable,
      setSector: action.bound,

      selectedUnits: observable,
      setSelectedUnits: action.bound,
      addSelectedUnit: action.bound,
      unselectUnit: action.bound,
      clearSelection: action.bound,
      focused: observable,
      focus: action.bound,
      unfocus: action.bound,

      overlay: observable,
      setOverlay: action.bound,
      closeOverlay: action.bound,

      selectionBox: observable,
      setSelectionBoxState: action.bound,
    });
  }

  setSector(sector: Sector) {
    this.sector = sector;
  }

  private clearSelectedPane() {
    this.paneFolder?.dispose();
    this.paneFolder = null;
  }

  setSelectedUnits(units: Selectable[]) {
    this.unfocus();
    this.clearSelectedPane();
    this.selectedUnits = units;
    window.selected = this.selectedUnits[0];

    if (units.length === 1) {
      const unit = units[0];

      this.paneFolder = pane.addFolder({
        title: unit.cp.name?.value || "Unit",
      });

      if (unit.hasComponents(["hitpoints"])) {
        this.paneFolder.addBinding(unit.cp.hitpoints.hp, "value", {
          max: unit.cp.hitpoints.hp.max,
          min: 0,
        });
        this.paneFolder.addBinding(unit.cp.hitpoints.hp, "max", {
          min: 0,
        });

        if (unit.cp.hitpoints.shield) {
          this.paneFolder.addBinding(unit.cp.hitpoints.shield, "value", {
            max: unit.cp.hitpoints.shield.max,
            min: 0,
          });
          this.paneFolder.addBinding(unit.cp.hitpoints.shield, "max", {
            min: 0,
          });
        }
      }

      if (unit.hasComponents(["position"])) {
        this.paneFolder.addBinding(unit.cp.position, "angle", {
          interval: 200,
        });
      }
    }
  }

  addSelectedUnit(unit: Selectable) {
    if (this.selectedUnits.includes(unit)) return;

    this.selectedUnits = [...this.selectedUnits, unit];
    window.selected = this.selectedUnits[0];
  }

  unselectUnit(unit: Selectable) {
    this.clearSelectedPane();
    this.selectedUnits = this.selectedUnits.filter((e) => e !== unit);
    window.selected = this.selectedUnits[0];
  }

  clearSelection() {
    this.selectedUnits = [];
    window.selected = null;
    this.unfocus();
    this.clearSelectedPane();
  }

  focus() {
    if (!this.selectedUnits.length) return;

    const inTheSameSector = this.selectedUnits.every(
      (e) => e.cp.position?.sector === this.selectedUnits[0].cp.position!.sector
    );
    if (!inTheSameSector) return;

    this.focused = true;
    this.setSector(
      this.selectedUnits[0].sim.getOrThrow(
        this.selectedUnits[0].cp.position!.sector
      )
    );
  }

  unfocus() {
    this.focused = false;
  }

  setOverlay(overlay: GameOverlayType) {
    this.overlay = overlay;
  }

  closeOverlay() {
    this.overlay = null;
  }

  setSelectionBoxState(state: boolean) {
    this.selectionBox = state;
  }
}

export const gameStore = new GameStore();
export const useGameStore = <TResult extends Array<any>>(
  selector: (_store: GameStore) => TResult
) => useMobx(gameStore, selector);
