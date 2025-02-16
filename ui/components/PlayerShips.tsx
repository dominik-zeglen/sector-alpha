import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleSummary,
} from "@kit/Collapsible";
import { first } from "@fxts/core";
import { useGameStore } from "@ui/state/game";
import { useContextMenuStore } from "@ui/state/contextMenu";
import { Vec2 } from "ogl";
import { useSim } from "../atoms";
import { ShipButton } from "./ShipButton";

export const PlayerShips: React.FC = () => {
  const [sim] = useSim();
  const player = first(sim.index.player.getIt())!;
  const ships = sim.index.ships
    .get()
    .filter((ship) => ship.cp.owner?.id === player.id);

  const [[selected], gameStore] = useGameStore((store) => [
    store.selectedUnits,
  ]);
  const [, contextMenuStore] = useContextMenuStore(() => []);

  const onContextMenu = (
    id: number,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (!selected.some((unit) => unit.id)) {
      contextMenuStore.open({
        position: new Vec2(event.clientX, event.clientY),
        worldPosition: undefined!,
        sector: null,
      });
    }
  };

  return (
    <Collapsible defaultOpen>
      <CollapsibleSummary>Owned Ships</CollapsibleSummary>
      <CollapsibleContent>
        {ships.length === 0 ? (
          <div>Currently you have no ships</div>
        ) : (
          ships.map((ship) => (
            <ShipButton
              key={ship.id}
              ship={ship}
              selected={selected.includes(ship)}
              onFocus={gameStore.focus}
              onSelect={(id) =>
                gameStore.setSelectedUnits([sim.getOrThrow(id)])
              }
              onContextMenu={onContextMenu}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

PlayerShips.displayName = "PlayerShips";
