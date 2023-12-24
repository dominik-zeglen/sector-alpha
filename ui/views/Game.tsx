import React from "react";
import ClickAwayListener from "react-click-away-listener";
import { deepEqual } from "mathjs";
import { RenderingSystem } from "@core/systems/rendering";
import { worldToHecs } from "@core/components/hecsPosition";
import { Dropdown, DropdownOptions } from "@kit/Dropdown";
import type { Entity } from "@core/entity";
import { MapView } from "@ui/components/MapView";
import { useRerender } from "@ui/hooks/useRerender";
import type { Commodity } from "@core/economy/commodity";
import { addStorage } from "@core/components/storage";
import { changeBudgetMoney } from "@core/components/budget";
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
import { setCheat } from "@core/utils/misc";
import { Notifications } from "@ui/components/Notifications";
import styles from "./Game.scss";

import { Panel } from "../components/Panel";
import {
  useContextMenu,
  useGameDialog,
  useGameOverlay,
  useNotifications,
  useSim,
} from "../atoms";
import { ContextMenu } from "../components/ContextMenu";
import { PlayerMoney } from "../components/PlayerMoney";

export const Game: React.FC = () => {
  const [sim, setSim] = useSim();
  const system = React.useRef<RenderingSystem>();
  const canvasRoot = React.useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useContextMenu();
  const [dialog, setDialog] = useGameDialog();
  const [overlay, setOverlay] = useGameOverlay();
  const { addNotification } = useNotifications();

  const selectedId = sim?.queries.settings.get()[0]!.cp.selectionManager.id;
  const [selectedEntity, setSelectedEntity] = React.useState<
    Entity | undefined
  >(selectedId ? sim?.get(selectedId) : undefined);
  const player = sim.queries.player.get()[0]!;

  React.useEffect(() => {
    if (!sim) return () => undefined;

    sim.start();
    system.current = new RenderingSystem();
    system.current.apply(sim);

    const unmount = () => {
      setDialog(null);
      setSim(undefined!);
    };

    sim.hooks.removeEntity.tap("Game", (entity) => {
      if (entity.id === selectedId) {
        setSelectedEntity(undefined);
      }
    });
    sim.hooks.destroy.tap("Game", unmount);

    setCheat(
      "addCommodity",
      (commodity: Commodity, quantity: number, id?: number) => {
        const entity = id ? sim.getOrThrow(id) : (window.selected as Entity);
        if (entity) {
          addStorage(entity.cp.storage!, commodity, quantity);
        }
      }
    );
    setCheat("addMoney", (quantity: number, id?: number) => {
      const entity = id
        ? sim.getOrThrow(id)
        : (window.selected as Entity | undefined) ?? player;
      changeBudgetMoney(entity.cp.budget!, quantity);
    });

    window.sim = sim;

    return unmount;
  }, [sim]);

  React.useEffect(() => {
    if (selectedEntity?.id !== selectedId) {
      setSelectedEntity(selectedId ? sim.get(selectedId) : undefined);
    }
  });

  // eslint-disable-next-line consistent-return
  React.useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const { x: worldX, y: worldY } = system.current!.viewport.toWorld(
        event.offsetX,
        event.offsetY
      );
      const worldPosition = [worldX / 10, worldY / 10];
      setMenu({
        active: true,
        position: [event.clientX, event.clientY],
        worldPosition,
        sector:
          sim.queries.sectors
            .get()
            .find((s) =>
              deepEqual(
                s.cp.hecsPosition.value,
                worldToHecs([worldPosition[0], worldPosition[1]])
              )
            ) ?? null,
      });
    };

    if (canvasRoot.current) {
      canvasRoot.current!.addEventListener("contextmenu", onContextMenu);

      return () => {
        canvasRoot.current?.removeEventListener("contextmenu", onContextMenu);
      };
    }
  }, [canvasRoot.current]);

  React.useEffect(() => {
    if (!menu.active) {
      sim.queries.settings.get()[0].cp.selectionManager.secondaryId = null;
    }
  }, [menu.active]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (overlay) {
          setOverlay(null);
        } else {
          setDialog(dialog ? null : { type: "config" });
        }
      }

      if (event.target instanceof HTMLInputElement) return;

      if (event.code === "KeyF") {
        setOverlay((prev) => (prev === "fleet" ? null : "fleet"));
      }
      if (event.code === "KeyJ") {
        setOverlay((prev) => (prev === "missions" ? null : "missions"));
      }
      if (event.code === "KeyP") {
        if (sim.speed === 0) sim.setSpeed(1);
        else sim.pause();
      }
    };

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [setDialog, overlay]);

  React.useEffect(() => {
    if (player.cp.missions.offer) {
      addNotification({
        icon: "question",
        message: "New mission offer",
        type: "warning",
        onClick: () => setDialog({ type: "missionOffer" }),
      });
    }
  }, [player.cp.missions.offer]);

  useRerender(250);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div>
      {/* This div is managed by react so each render would override
      any changes made by pixi, like cursor property. That's why rendering
      system creates own canvas here */}
      <div className={styles.canvasRoot} ref={canvasRoot} id="canvasRoot">
        <PlayerMoney />
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
      <Panel entity={selectedEntity} />
      <Notifications />
      <Overlay
        open={!!overlay}
        onClose={() => setOverlay(null)}
        title={
          overlay === "fleet"
            ? "Fleet Management"
            : overlay === "missions"
            ? "Active Missions"
            : ""
        }
      >
        <FleetOverlay />
        <MissionsOverlay />
      </Overlay>
      {menu.active && (!!menu.sector || menu.overlay) && (
        <ClickAwayListener
          mouseEvent="mousedown"
          onClickAway={() => setMenu({ ...menu, active: false })}
        >
          <div
            className={styles.menu}
            style={{ top: menu.position[1], left: menu.position[0] }}
          >
            <Dropdown onClick={() => setMenu({ ...menu, active: false })}>
              <DropdownOptions static>
                <ContextMenu />
              </DropdownOptions>
            </Dropdown>
          </div>
        </ClickAwayListener>
      )}
    </div>
  );
};
