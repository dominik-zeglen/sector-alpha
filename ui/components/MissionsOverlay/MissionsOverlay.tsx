import { useSim } from "@ui/atoms";
import React from "react";
import { useGameStore } from "@ui/state/game";
import { useOverlayRegister } from "../Overlay/Overlay";
import { MissionsOverlayComponent } from "./MissionsOverlayComponent";

export const MissionsOverlay: React.FC = () => {
  const [sim] = useSim();
  const [[overlay], gameStore] = useGameStore((store) => [store.overlay]);
  useOverlayRegister("missions");

  if (overlay !== "missions") return null;

  const player = sim.index.player.get()[0]!;

  return (
    <MissionsOverlayComponent
      missions={player.cp.missions.value}
      onMissionCancel={(index) => player.cp.missions.value.splice(index, 1)}
      onReferenceClick={(id) => {
        gameStore.closeOverlay();
        gameStore.setSelectedUnits([sim.getOrThrow(id)]);
        setTimeout(gameStore.focus, 100);
      }}
    />
  );
};
