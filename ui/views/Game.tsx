import React from "react";
import { MapView } from "@ui/components/MapView";
import { useRerender } from "@ui/hooks/useRerender";
import { MapPanel } from "@ui/components/MapPanel";
import {
  MapPanelButton,
  MapPanelTabContent,
} from "@ui/components/MapPanel/MapPanelButton";
import { TradeFinder } from "@ui/components/TradeFinder";
import { Relations } from "@ui/components/Relations/Relations";
import { Overlay } from "@ui/components/Overlay/Overlay";
import { FleetOverlay } from "@ui/components/FleetOverlay/FleetOverlay";
import { MissionsOverlay } from "@ui/components/MissionsOverlay";
import { Notifications } from "@ui/components/Notifications";
import { SimControl } from "@ui/components/SimControl/SimControl";
import DevOverlay from "@ui/components/DevOverlay/DevOverlay";
import { useGameSettings } from "@ui/hooks/useGameSettings";
import { SelectedUnit } from "@ui/components/SelectedUnit";
import SimAvgTimeGraph from "@ui/components/dev/SimAvgTimeGraph/SimAvgTimeGraph";
import { TacticalMap } from "@ui/components/TacticalMap/TacticalMap";
import { CurrentSector } from "@ui/components/CurrentSector/CurrentSector";
import type { Faction } from "@core/archetypes/faction";
import { MapOverlay } from "@ui/components/MapOverlay/MapOverlay";
import { pane } from "@ui/context/Pane";
import type { GameOverlayType } from "@ui/state/game";
import { useGameStore } from "@ui/state/game";
import styles from "./Game.scss";

import { Panel } from "../components/Panel";
import { useGameDialog, useNotifications, useSim } from "../atoms";
import { ContextMenu } from "../components/ContextMenu";
import { PlayerMoney } from "../components/PlayerMoney";

const overlayKeyCodes: Record<string, NonNullable<GameOverlayType>> = {
  Backslash: "dev",
  KeyF: "fleet",
  KeyJ: "missions",
  KeyM: "map",
};

const Game: React.FC = () => {
  const [sim, setSim] = useSim();
  const canvasRoot = React.useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useGameDialog();
  const { addNotification } = useNotifications();
  const [gameSettings] = useGameSettings();
  const pressedKeys = React.useRef(new Set<string>());

  const player = sim.index.player.get()[0]!;
  const [[currentSector, overlay, selectedUnits, selectionBox], gameStore] =
    useGameStore((store) => [
      store.sector,
      store.overlay,
      store.selectedUnits,
      store.selectionBox,
    ]);

  React.useEffect(() => {
    if (!sim) return () => undefined;

    sim.start();

    const unmount = () => {
      setDialog(null);
      setSim(undefined!);
    };

    sim.hooks.removeEntity.subscribe("Game", (entity) => {
      if (
        entity.hasComponents(["position"]) &&
        selectedUnits.includes(entity)
      ) {
        gameStore.unselectUnit(entity);
      }
    });
    sim.hooks.destroy.subscribe("Game", unmount);

    window.sim = sim;

    return unmount;
  }, [sim]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.code);

      if (event.code === "Escape") {
        if (overlay) {
          gameStore.setOverlay(null);
        } else {
          setDialog(dialog ? null : { type: "config" });
        }
      }

      if (event.target instanceof HTMLInputElement) return;

      if (
        event.code in overlayKeyCodes &&
        (overlayKeyCodes[event.code] !== "dev" || gameSettings.dev)
      ) {
        if (gameStore.overlay === overlayKeyCodes[event.code]) {
          gameStore.closeOverlay();
        } else {
          gameStore.setOverlay(overlayKeyCodes[event.code]);
        }
      }
      if (event.code === "Space") {
        if (sim.speed === 0) sim.unpause();
        else sim.pause();
      }
      if (
        event.code === "KeyK" &&
        pressedKeys.current.has("MetaLeft") &&
        gameSettings.dev
      ) {
        pane.hidden = !pane.hidden;
      }

      if (
        event.code.startsWith("Digit") &&
        pressedKeys.current.has("ShiftLeft")
      ) {
        if (event.code === "Digit1") sim.setSpeed(1);
        if (event.code === "Digit2") sim.setSpeed(5);
        if (event.code === "Digit3" && gameSettings.dev) sim.setSpeed(50);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setDialog, overlay, gameSettings.dev]);

  React.useEffect(() => {
    if (player.cp.missions.offer) {
      if (player.cp.missions.offer.immediate) {
        setDialog({ type: "missionOffer" });
      } else {
        addNotification({
          icon: "question",
          message: "New mission offer",
          type: "warning",
          onClick: () => setDialog({ type: "missionOffer" }),
        });
      }
    }
  }, [player.cp.missions.offer]);

  useRerender(200);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      id="game-root"
      data-debug={window.dev}
      style={{ pointerEvents: selectionBox ? "none" : undefined }}
    >
      <div className={styles.canvasRoot} ref={canvasRoot} id="canvasRoot">
        <TacticalMap sim={sim} />
        <SimAvgTimeGraph />
        <PlayerMoney />
        <SimControl />
        {!overlay && (
          <CurrentSector
            name={currentSector?.cp.name.value ?? ""}
            owner={
              currentSector?.cp.owner?.id
                ? sim.getOrThrow<Faction>(currentSector.cp.owner.id).cp.name
                    .value
                : undefined
            }
            color={
              currentSector?.cp.owner?.id
                ? sim.getOrThrow<Faction>(currentSector.cp.owner.id).cp.color
                    .value
                : undefined
            }
          />
        )}
        <SelectedUnit />
        <MapPanel
          tabs={
            <>
              <MapPanelButton>Trade</MapPanelButton>
              <MapPanelButton>Legend</MapPanelButton>
              <MapPanelButton>Relations</MapPanelButton>
            </>
          }
        >
          <MapPanelTabContent>
            <TradeFinder />
          </MapPanelTabContent>
          <MapPanelTabContent>
            <MapView />
          </MapPanelTabContent>
          <MapPanelTabContent>
            <Relations />
          </MapPanelTabContent>
        </MapPanel>
      </div>
      <Panel entity={selectedUnits[0]} />
      <Notifications />
      <Overlay
        active={overlay}
        open={!!overlay}
        onClose={gameStore.closeOverlay}
      >
        {gameSettings.dev && <DevOverlay />}
        <FleetOverlay />
        <MissionsOverlay />
        <MapOverlay />
      </Overlay>
      <ContextMenu />
    </div>
  );
};

const GameWrapper: React.FC = () => {
  const [sim] = useSim();

  if (!sim) return null;

  return <Game />;
};

export { GameWrapper as Game };
