import React from "react";
import SVG from "react-inlinesvg";
import { RequireComponent } from "@core/tsHelpers";
import locationIcon from "@assets/ui/location.svg";
import { IconButton } from "@kit/IconButton";
import { Table, TableCell } from "@kit/Table";
import { nano } from "../style";

const styles = nano.sheet({
  colAction: {
    width: "48px",
    textAlign: "right",
  },
  colName: {
    textAlign: "left",
  },
});

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
          {entity.hasComponents(["selection"]) && (
            <TableCell className={styles.colAction}>
              <IconButton
                onClick={() => {
                  const { selectionManager } =
                    entity.sim.queries.settings.get()[0].cp;
                  selectionManager.id = entity.id;
                  selectionManager.focused = true;
                }}
              >
                <SVG src={locationIcon} />
              </IconButton>
            </TableCell>
          )}
        </tr>
      ))}
    </tbody>
  </Table>
);

EntityList.displayName = "EntityList";
