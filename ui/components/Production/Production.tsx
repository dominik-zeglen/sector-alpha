import React from "react";
import groupBy from "lodash/groupBy";
import type { RequireComponent } from "@core/tsHelpers";
import { Table, TableCell } from "@kit/Table";
import { IconButton } from "@kit/IconButton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleSummary,
} from "@kit/Collapsible";
import { useGameDialog } from "@ui/atoms";
import { isOwnedByPlayer } from "@core/utils/misc";
import { Tooltip } from "@kit/Tooltip";
import Text from "@kit/Text";
import { ConfigIcon, ExclamationIcon, LocationIcon } from "@assets/ui/icons";
import { gameStore } from "@ui/state/game";
import styles from "./Production.scss";

export interface ProductionProps {
  entity: RequireComponent<"modules">;
}

export const Production: React.FC<ProductionProps> = ({ entity }) => {
  const { modules } = entity.cp;
  const { productionModules, utilityModules } = groupBy(
    modules.ids
      .map(entity.sim.getOrThrow)
      .map((e) => e.requireComponents(["parent", "name"])),
    (facilityModule) =>
      facilityModule.hasComponents(["production"])
        ? "productionModules"
        : "utilityModules"
  );
  const [, setDialog] = useGameDialog();

  const openModuleManager: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    setDialog({
      type: "facilityModuleManager",
      entityId: entity.id,
    });
  };

  return (
    <>
      <Collapsible>
        <CollapsibleSummary>
          <div className={styles.summary}>
            <span>Modules</span>
            {isOwnedByPlayer(entity) && (
              <IconButton
                className={styles.manage}
                variant="naked"
                onClick={openModuleManager}
              >
                <ConfigIcon />
              </IconButton>
            )}
          </div>
        </CollapsibleSummary>
        <CollapsibleContent>
          {productionModules?.length > 0 || utilityModules?.length > 0 ? (
            <Table>
              <tbody>
                {(productionModules ?? []).map((facilityModule) => (
                  <tr key={facilityModule.id}>
                    <TableCell>{facilityModule.cp.name!.value}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      {facilityModule.cp.production!.active &&
                        !facilityModule.cp.production!.produced && (
                          <Tooltip
                            // eslint-disable-next-line react/no-unstable-nested-components
                            anchor={(ref) => (
                              <ExclamationIcon
                                innerRef={ref}
                                className={styles.haltedIcon}
                              />
                            )}
                          >
                            <Text variant="caption">
                              Production is halted. <br />
                              Does facility has enough resources?
                            </Text>
                          </Tooltip>
                        )}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
              <tbody>
                {(utilityModules ?? []).map((facilityModule, index) => {
                  const teleport = facilityModule.cp.teleport?.destinationId
                    ? entity.sim.get(facilityModule.cp.teleport?.destinationId)
                    : null;

                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={`${facilityModule.cp.name.value}-${index}`}>
                      <TableCell>{facilityModule.cp.name.value}</TableCell>
                      <TableCell>
                        {teleport && (
                          <IconButton
                            onClick={() => {
                              gameStore.setSelectedUnits([
                                entity.sim.getOrThrow(teleport.cp.parent!.id),
                              ]);
                              gameStore.focus();
                            }}
                          >
                            <LocationIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div>This facility has no modules built yet</div>
          )}
        </CollapsibleContent>
      </Collapsible>
      {null}
    </>
  );
};
