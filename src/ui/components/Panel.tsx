import React from "react";
import SVG from "react-inlinesvg";
import clsx from "clsx";
import { shipComponents, ship as asShip } from "../../archetypes/ship";
import { Entity } from "../../components/entity";
import FacilityPanel from "./FacilityPanel";
import ffIcon from "../../../assets/ui/ff.svg";
import pauseIcon from "../../../assets/ui/pause.svg";
import locationIcon from "../../../assets/ui/location.svg";
import configIcon from "../../../assets/ui/config.svg";
import arrowLeftIcon from "../../../assets/ui/arrow_left.svg";
import playIcon from "../../../assets/ui/play.svg";
import { IconButton } from "./IconButton";
import ShipPanel from "./ShipPanel";
import { nano, theme } from "../../style";
import { ConfigDialog } from "./ConfigDialog";
import {
  facilityComponents,
  facility as asFacility,
} from "../../archetypes/facility";
import EntityName from "./EntityName";
import Resources from "./Resources";
import { sector, sectorComponents } from "../../archetypes/sector";
import SectorResources from "./SectorStats";
import SectorPrices from "./SectorPrices";
import Inflation from "./InflationStats";
import { useSim } from "../atoms";
import { PlayerShips } from "./PlayerShips";
import { useRerender } from "../hooks/useRerender";

const styles = nano.sheet({
  iconBar: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(3),
  },
  iconBarCollapsed: {
    flexDirection: "column",
    marginBottom: 0,
  },
  root: {
    border: `1px solid ${theme.palette.default}`,
    borderLeft: "none",
    borderTopRightRadius: "8px",
    borderBottomRightRadius: "8px",
    background: theme.palette.background,
    maxHeight: "calc(100vh - 128px)",
    padding: theme.spacing(3),
    position: "absolute",
    top: "64px",
    left: "0",
    width: theme.isMobile ? "380px" : "450px",
    zIndex: 1,
  },
  rootCollapsed: {
    width: "80px",
  },
  scrollArea: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
    overflowY: "scroll",
    height: "calc(100vh - 234px)",
    paddingBottom: theme.spacing(3),
  },
  rotate: {
    transform: "rotate(180deg)",
  },
  spacer: {
    flex: 1,
  },
});

export const Panel: React.FC = () => {
  const [isCollapsed, setCollapsed] = React.useState(true);
  const [openConfig, setOpenConfig] = React.useState(false);
  const toggleCollapse = React.useCallback(() => setCollapsed((c) => !c), []);

  const [sim] = useSim();
  const selectedId = sim.queries.settings.get()[0]!.cp.selectionManager.id;

  const [entity, setEntity] = React.useState<Entity | undefined>(
    selectedId ? sim.get(selectedId) : undefined
  );

  useRerender(250);

  React.useEffect(() => {
    if (entity?.id !== selectedId) {
      setEntity(selectedId ? sim.get(selectedId) : undefined);
    }
  });

  React.useEffect(() => {
    if (entity && isCollapsed) {
      toggleCollapse();
    }
  }, [entity]);

  React.useEffect(() => {
    if (!sim) return;
    if (openConfig) {
      sim.pause();
    } else {
      sim.start();
    }
  }, [openConfig]);

  if (!sim) return null;

  return (
    <div
      className={clsx(styles.root, {
        [styles.rootCollapsed]: isCollapsed,
      })}
      id="toolbar"
    >
      <div
        className={clsx(styles.iconBar, {
          [styles.iconBarCollapsed]: isCollapsed,
        })}
      >
        {isCollapsed ? (
          <IconButton className={styles.rotate} onClick={toggleCollapse}>
            <SVG src={arrowLeftIcon} />
          </IconButton>
        ) : (
          <IconButton onClick={() => setOpenConfig(true)}>
            <SVG src={configIcon} />
          </IconButton>
        )}
        <IconButton onClick={sim?.pause}>
          <SVG src={pauseIcon} />
        </IconButton>
        <IconButton
          onClick={() => {
            sim.setSpeed(1);
            sim.start();
          }}
        >
          <SVG src={playIcon} />
        </IconButton>
        <IconButton
          onClick={() => {
            sim.setSpeed(10);
            sim.start();
          }}
        >
          <SVG src={ffIcon} />
        </IconButton>
        {!!entity && (
          <IconButton
            onClick={() => {
              sim.find((e) =>
                e.hasComponents(["selectionManager"])
              )!.cp.selectionManager!.focused = true;
            }}
          >
            <SVG src={locationIcon} />
          </IconButton>
        )}
        {!isCollapsed ? (
          <>
            <div className={styles.spacer} />
            <IconButton onClick={toggleCollapse}>
              <SVG src={arrowLeftIcon} />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={() => setOpenConfig(true)}>
            <SVG src={configIcon} />
          </IconButton>
        )}
      </div>
      {!isCollapsed && (
        <div className={styles.scrollArea}>
          {entity ? (
            <>
              {entity.hasComponents(["name"]) && (
                <EntityName entity={entity.requireComponents(["name"])} />
              )}
              {entity.hasComponents(shipComponents) ? (
                <ShipPanel entity={asShip(entity)} />
              ) : entity.hasComponents(facilityComponents) ? (
                <FacilityPanel entity={asFacility(entity)} />
              ) : null}
              {entity.hasComponents(sectorComponents) && (
                <>
                  <Resources entity={sector(entity)} />
                  <SectorResources entity={sector(entity)} />
                  <SectorPrices entity={sector(entity)} />
                </>
              )}
            </>
          ) : (
            <>
              <PlayerShips />
              {window.dev && (
                <>
                  <Inflation sim={sim} />
                  <hr />
                </>
              )}
            </>
          )}
        </div>
      )}
      <ConfigDialog open={openConfig} onClose={() => setOpenConfig(false)} />
    </div>
  );
};
