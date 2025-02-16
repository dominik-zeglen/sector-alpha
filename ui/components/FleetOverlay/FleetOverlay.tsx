import type { Ship } from "@core/archetypes/ship";
import { filter, map, pipe, toArray } from "@fxts/core";
import { useSim } from "@ui/atoms";
import React from "react";
import type { Sim } from "@core/sim";
import { useContextMenuStore } from "@ui/state/contextMenu";
import { useGameStore } from "@ui/state/game";
import { Vec2 } from "ogl";
import { useOverlayRegister } from "../Overlay/Overlay";
import { FleetOverlayComponent } from "./FleetOverlayComponent";

function getSubordinateTree(commander: Ship, sim: Sim) {
  if (commander.cp.subordinates.ids.length === 0) return commander;

  return {
    commander,
    subordinates: commander.cp.subordinates.ids.map((id) =>
      getSubordinateTree(sim.getOrThrow(id), sim)
    ),
  };
}

export const FleetOverlay: React.FC = () => {
  const [sim] = useSim();
  const [[overlay, selectedUnits], gameStore] = useGameStore((store) => [
    store.overlay,
    store.selectedUnits,
  ]);
  useOverlayRegister("fleet");
  const [, contextMenuStore] = useContextMenuStore(() => []);

  const setSelected = (id: number) => {
    gameStore.setSelectedUnits([sim.getOrThrow(id)]);
  };
  const onFocus = () => {
    gameStore.focus();
    gameStore.closeOverlay();
  };
  const onContextMenu = (
    id: number,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!selectedUnits.some((unit) => unit.id === id)) {
      contextMenuStore.open({
        position: new Vec2(event.clientX, event.clientY),
        worldPosition: undefined!,
        sector: null,
        target: sim.getOrThrow(id),
      });
    }
  };

  const player = sim.index.player.get()[0]!;
  const fleets = React.useMemo(
    () =>
      pipe(
        sim.index.ships.getIt(),
        filter(
          (ship) =>
            ship.cp.owner.id === player.id &&
            ship.cp.subordinates.ids.length > 0 &&
            !ship.cp.commander
        ),
        map((commander) => getSubordinateTree(commander, sim)),
        toArray
      ),
    [sim.index.ships.getIt()]
  );
  const unassigned = React.useMemo(
    () =>
      pipe(
        sim.index.ships.getIt(),
        filter(
          (ship) =>
            ship.cp.owner.id === player.id &&
            ship.cp.subordinates.ids.length === 0 &&
            !ship.cp.commander
        ),
        toArray
      ),
    [sim.index.ships.getIt()]
  );

  if (overlay !== "fleet") return null;

  return (
    <FleetOverlayComponent
      fleets={fleets}
      unassigned={unassigned}
      selected={selectedUnits.map((unit) => unit.id)}
      onContextMenu={onContextMenu}
      onSelect={setSelected}
      onFocus={onFocus}
    />
  );
};
