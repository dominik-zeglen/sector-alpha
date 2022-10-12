import React from "react";
import SVG from "react-inlinesvg";
import { Faction } from "@core/archetypes/faction";
import { RequireComponent } from "@core/tsHelpers";
import { limitMax, limitMin } from "@core/utils/limit";
import arrowLeftIcon from "@assets/ui/arrow_left.svg";
import { nano, theme } from "../style";
import { IconButton } from "./IconButton";

const styles = nano.sheet({
  arrowRight: {
    transform: "rotate(180deg)",
  },
  pagination: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  paginationButtons: {
    display: "flex",
    gap: theme.spacing(1),
  },
  list: {
    margin: 0,
    padding: 0,
  },
  item: {
    "&:first-child": {
      paddingTop: 0,
    },
    "&:last-child": {
      borderBottom: "none",
    },
    display: "block",
    padding: `${theme.spacing(2)} 0`,
    borderBottom: `1px solid ${theme.palette.default}`,
  },
});

const pageSize = 20;

const Journal: React.FC<{ entity: RequireComponent<"journal"> }> = ({
  entity,
}) => {
  const [cursor, setCursor] = React.useState(0);

  return (
    <div>
      <ul className={styles.list}>
        {entity.cp.journal.entries
          .slice()
          .reverse()
          .slice(cursor, cursor + pageSize)
          .map((entry, entryIndex) => (
            <li
              className={styles.item}
              key={entry.time.toString() + entryIndex}
            >
              {entry.type === "trade" ? (
                <div>
                  {entry.action === "buy"
                    ? `Bought ${entry.quantity} x ${entry.commodity} for ${
                        entry.price * entry.quantity
                      } UTT (${entry.price} UTT) from ${entry.target}`
                    : `Sold ${entry.quantity} x ${entry.commodity} for ${
                        entry.price * entry.quantity
                      } UTT (${entry.price} UTT) to ${entry.target}`}
                </div>
              ) : (
                <div>
                  Build ship {entry.name} to{" "}
                  {entity.sim.getOrThrow<Faction>(entry.faction).cp.name.value}{" "}
                  for {entry.price} UTT
                </div>
              )}
            </li>
          ))}
      </ul>
      <div className={styles.pagination}>
        <span>
          Entries {cursor}-
          {limitMax(cursor + pageSize, entity.cp.journal.entries.length)} out of{" "}
          {entity.cp.journal.entries.length}
        </span>
        <div className={styles.paginationButtons}>
          <IconButton
            disabled={cursor === 0}
            onClick={() =>
              setCursor((prevCursor) => limitMin(prevCursor - pageSize, 0))
            }
          >
            <SVG src={arrowLeftIcon} />
          </IconButton>
          <IconButton
            disabled={cursor + pageSize >= entity.cp.journal.entries.length}
            onClick={() => setCursor((prevCursor) => prevCursor + pageSize)}
          >
            <SVG className={styles.arrowRight} src={arrowLeftIcon} />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

export default Journal;
