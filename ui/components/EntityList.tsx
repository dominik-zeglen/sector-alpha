import React from "react";
import type { RequireComponent } from "@core/tsHelpers";
import { IconButton } from "@kit/IconButton";
import { Table, TableCell } from "@kit/Table";
import { RedoIcon } from "@assets/ui/icons";
import { gameStore } from "@ui/state/game";
import styles from "./EntityList.scss";

export interface EntityListProps {
  entities: RequireComponent<"name">[];
}

export const EntityList: React.FC<EntityListProps> = ({ entities }) => (
  <Table>
    <tbody>
      {entities.map((entity) => (
        <tr key={entity.id}>
          <TableCell className={styles.colName}>
            {entity.cp.name?.value}
          </TableCell>
          {entity.tags.has("selection") &&
            entity.hasComponents(["position"]) && (
              <TableCell className={styles.colAction}>
                <IconButton
                  onClick={(event) => {
                    if (event.shiftKey) {
                      gameStore.addSelectedUnit(entity);
                    } else {
                      gameStore.setSelectedUnits([entity]);
                    }
                  }}
                >
                  <RedoIcon />
                </IconButton>
              </TableCell>
            )}
        </tr>
      ))}
    </tbody>
  </Table>
);

EntityList.displayName = "EntityList";
