import React from "react";
import { useSim } from "@ui/atoms";
import type { StrategicMapEngine } from "@ogl-engine/engine/engine2d";
import { useGameStore } from "@ui/state/game";
import { useOverlayRegister } from "../Overlay/Overlay";
import { StrategicMap } from "./StrategicMap";
import { SectorOverview } from "./SectorOverview";
import styles from "./styles.scss";

export const MapOverlay: React.FC = () => {
  useOverlayRegister("map");
  const [[overlay], gameStore] = useGameStore((store) => [store.overlay]);
  const [sim] = useSim();
  const engine = React.useRef<StrategicMapEngine>();

  const close = React.useCallback(() => {
    gameStore.setOverlay(null);
  }, []);

  React.useEffect(() => {
    if (overlay === "map") {
      engine.current?.resize();
    }
  }, [overlay]);

  return (
    <div
      className={styles.root}
      style={{
        visibility: overlay === "map" ? "visible" : "hidden",
      }}
    >
      <StrategicMap sim={sim} close={close} engineRef={engine} />
      {overlay === "map" && <SectorOverview />}
    </div>
  );
};
