import type { DevAction } from "@core/actions/types";
import React from "react";
import { actionLoader } from "@core/actionLoader";
import { useGameStore } from "@ui/state/game";
import { useSim } from "@ui/atoms";
import { useOverlayRegister } from "../Overlay/Overlay";
import { DevOverlayComponent } from "./DevOverlayComponent";

const DevOverlay: React.FC = () => {
  const [sim] = useSim();
  React.useEffect(() => {
    actionLoader.link(sim);

    return actionLoader.reset;
  }, []);
  const [actions, setActions] = React.useState<DevAction[]>(actionLoader.all());
  const [[overlay, selectedUnits], gameStore] = useGameStore((store) => [
    store.overlay,
    store.selectedUnits,
  ]);
  useOverlayRegister("dev");

  if (overlay !== "dev") {
    return null;
  }

  return (
    <DevOverlayComponent
      actions={actions}
      target={selectedUnits.length ? selectedUnits[0].id : null}
      onReload={() => setActions(actionLoader.all())}
      onClose={gameStore.closeOverlay}
    />
  );
};

export default DevOverlay;
