import React from "react";
import { shipComponents } from "@core/archetypes/ship";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@kit/Tabs";
import type { Entity } from "@core/entity";
import type { Facility } from "@core/archetypes/facility";
import { sector, sectorComponents } from "@core/archetypes/sector";
import { IconButton } from "@kit/IconButton";
import { isOwnedByPlayer } from "@core/utils/misc";
import { getRequiredCrew } from "@core/utils/crew";
import { find } from "@fxts/core";
import { ConfigIcon } from "@assets/ui/icons";
import { actionLoader } from "@core/actionLoader";
import ShipPanel from "../ShipPanel";
import { ConfigDialog } from "../ConfigDialog";
import EntityName from "../EntityName";
import Resources from "../Resources";
import SectorPrices from "../SectorPrices";
import Inflation from "../InflationStats";
import { useGameDialog, useSim } from "../../atoms";
import { PlayerShips } from "../PlayerShips";
import { PlayerFacilities } from "../PlayerFacilities";
import { TradeDialog } from "../TradeDialog";
import { PanelComponent } from "./PanelComponent";
import { FacilityModuleManager } from "../FacilityModuleManager";
import Journal from "../Journal";
import styles from "./Panel.scss";
import { Offers } from "../Offers";
import { Undeploy } from "../Undeploy";
import { Subordinates } from "../Subordinates";
import { FacilityMoneyManager } from "../FacilityMoneyManager";
import { Allocations } from "../Allocations";
import { FacilityTradeManager } from "../FacilityTradeManager";
import { Storage } from "../Storage/Storage";
import { ShipyardDialog } from "../ShipyardDialog";
import { SimpleStorage } from "../Storage";
import { MissionDialog } from "../MissionDialog";
import { Crew } from "../Crew/Crew";
import { ImmediateConversationDialog } from "../ImmediateConversation";
import { HitPointsInfo } from "../HitPoints";
import { Docks } from "../Docks";
import ShipBuildingQueue from "../ShipBuildingQueue";
import { Production } from "../Production";

export interface PanelProps {
  expanded?: boolean;
  entity: Entity | null;
}

const JournalWrapper: React.FC<
  React.PropsWithChildren<{ entity: Entity; isPlayerOwned: boolean }>
> = ({ entity, isPlayerOwned, children }) =>
  entity.hasComponents(["journal"]) && isPlayerOwned ? (
    <TabGroup>
      <TabList className={styles.tab}>
        <Tab>General</Tab>
        <Tab>Journal</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>{children}</TabPanel>
        <TabPanel>
          <Journal entity={entity.requireComponents(["journal"])} />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  ) : (
    (children as any)
  );

export const Panel: React.FC<PanelProps> = ({ entity, expanded }) => {
  const [isCollapsed, setCollapsed] = React.useState(
    expanded === undefined ? true : !expanded
  );

  const [dialog, setDialog] = useGameDialog();
  const toggleCollapse = React.useCallback(() => setCollapsed((c) => !c), []);
  const [showHidden, setShowHidden] = React.useState(false);

  const [sim] = useSim();
  React.useEffect(() => {
    actionLoader.register(
      {
        category: "core",
        description: "Show all entity data like they were owned by player",
        fn: () => setShowHidden((v) => !v),
        name: "Show hidden entity data",
        slug: "showEntityHiddenData",
        type: "basic",
      },
      "Panel"
    );
  }, []);

  const closeDialog = React.useCallback(() => setDialog(null), []);

  React.useEffect(() => {
    if (entity && isCollapsed) {
      toggleCollapse();
    }
  }, [entity]);

  React.useEffect(() => {
    if (!sim) return;
    if (dialog?.type === "config") {
      sim.stop();
    }
  }, [dialog, sim]);

  const playerOwned = entity ? isOwnedByPlayer(entity) : false;
  const player = sim.index.player.get()[0]!;

  let requiredCrew: number | null = null;
  let growth: "positive" | "negative" | "neutral" | undefined;
  if (entity?.cp.crew) {
    requiredCrew = getRequiredCrew(
      entity.requireComponents(["crew", "modules"])
    );
    const hubModule = find(
      (e) =>
        e.tags.has("facilityModuleType:hub") &&
        sim.getOrThrow<Facility>(e.cp.parent!.id!).cp.position.sector ===
          entity.cp.position!.sector,
      sim.entities.values()
    );
    if (hubModule)
      growth = hubModule.cp.production!.produced
        ? entity.cp.crew!.workers.current >= entity.cp.crew!.workers.max
          ? "neutral"
          : "positive"
        : entity.cp.crew!.workers.current > 0
        ? "negative"
        : "neutral";
  }

  const showSensitive = playerOwned || showHidden;

  return (
    <>
      <PanelComponent
        isCollapsed={isCollapsed}
        onCollapseToggle={toggleCollapse}
        onPlayerAssets={() => {
          setCollapsed(false);
        }}
      >
        {!isCollapsed &&
          (entity ? (
            <>
              {entity.hasComponents(["name"]) && (
                <EntityName
                  entity={entity.requireComponents(["name"])}
                  editable={playerOwned}
                />
              )}
              <JournalWrapper entity={entity} isPlayerOwned={playerOwned}>
                {entity.hasComponents(["trade", "storage", "budget"]) && (
                  <>
                    {showSensitive && (
                      <div>
                        Money: {entity.components.budget!.available.toFixed(0)}
                        {playerOwned && (
                          <IconButton
                            className={styles.manage}
                            variant="naked"
                            onClick={() =>
                              setDialog({
                                type: "facilityMoneyManager",
                                entityId: entity.id,
                              })
                            }
                          >
                            <ConfigIcon />
                          </IconButton>
                        )}
                      </div>
                    )}
                    <hr />
                    <Offers
                      entity={entity.requireComponents([
                        "trade",
                        "storage",
                        "budget",
                      ])}
                      onManage={
                        playerOwned
                          ? () =>
                              setDialog({
                                type: "facilityTradeManager",
                                entityId: entity.id,
                              })
                          : undefined
                      }
                    />
                    <hr />
                  </>
                )}
                {entity.hasComponents(["hitpoints"]) && (
                  <HitPointsInfo hp={entity.cp.hitpoints} />
                )}
                {entity.hasComponents(shipComponents) && (
                  <ShipPanel entity={entity} showSensitive={showSensitive} />
                )}
                {entity.hasComponents(["modules", "compoundProduction"]) &&
                  showSensitive && (
                    <>
                      <Production entity={entity} />
                      <hr />
                    </>
                  )}
                {entity.hasComponents(["shipyard"]) && (
                  <>
                    <ShipBuildingQueue entity={entity} />
                    <hr />
                  </>
                )}
                {entity.hasComponents(["docks"]) && (
                  <>
                    <Docks entity={entity} />
                    <hr />
                  </>
                )}
                {entity.hasComponents(sectorComponents) && (
                  <>
                    <Resources entity={sector(entity)} />
                    <hr />
                    <SectorPrices entity={sector(entity)} />
                  </>
                )}
                {entity.hasComponents(["storage"]) && showSensitive && (
                  <>
                    <Storage entity={entity.requireComponents(["storage"])} />
                    <hr />
                    {entity.tags.has("facility") && (
                      <>
                        <Allocations
                          entity={entity.requireComponents(["storage"])}
                        />
                        <hr />
                      </>
                    )}
                  </>
                )}
                {entity.hasComponents(["simpleCommodityStorage"]) &&
                  showSensitive && (
                    <>
                      <SimpleStorage
                        entity={entity.requireComponents([
                          "simpleCommodityStorage",
                        ])}
                      />
                      <hr />
                    </>
                  )}
                {entity.hasComponents(["crew"]) && showSensitive && (
                  <Crew
                    entity={entity.requireComponents(["crew"])}
                    requiredCrew={requiredCrew}
                    growth={growth!}
                  />
                )}
                {showSensitive && <Subordinates entity={entity} />}
                {entity.hasComponents(["deployable"]) && showSensitive && (
                  <Undeploy
                    deployable={entity.requireComponents([
                      "deployable",
                      "position",
                    ])}
                    facility={
                      entity.cp.builder?.targetId
                        ? sim.get(entity.cp.builder.targetId)
                        : undefined
                    }
                  />
                )}
              </JournalWrapper>
            </>
          ) : (
            <JournalWrapper isPlayerOwned entity={player}>
              <PlayerShips />
              <PlayerFacilities />
              {window.dev && (
                <>
                  <Inflation sim={sim} />
                  <hr />
                </>
              )}
            </JournalWrapper>
          ))}
      </PanelComponent>
      <ConfigDialog
        open={dialog?.type === "config"}
        onClose={() => {
          closeDialog();
          sim.start();
        }}
      />
      <TradeDialog open={dialog?.type === "trade"} onClose={closeDialog} />
      <FacilityModuleManager
        open={dialog?.type === "facilityModuleManager"}
        onClose={closeDialog}
      />
      <FacilityMoneyManager
        open={dialog?.type === "facilityMoneyManager"}
        onClose={closeDialog}
      />
      <FacilityTradeManager
        open={dialog?.type === "facilityTradeManager"}
        onClose={closeDialog}
      />
      <ShipyardDialog
        open={dialog?.type === "shipyard"}
        onClose={closeDialog}
      />
      <MissionDialog
        open={dialog?.type === "missionOffer"}
        onClose={closeDialog}
      />
      <ImmediateConversationDialog
        open={dialog?.type === "conversation"}
        onClose={closeDialog}
      />
    </>
  );
};
