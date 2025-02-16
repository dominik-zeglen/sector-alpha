import { IconButton } from "@kit/IconButton";
import React from "react";
import clsx from "clsx";
import Text from "@kit/Text";
import { ChevronDownIcon } from "@assets/ui/icons";
import type { RequirePureComponent } from "@core/tsHelpers";
import styles from "./FleetOverlay.scss";
import { ShipButton } from "../ShipButton";

type Ship = RequirePureComponent<"name" | "autoOrder">;

export interface Fleet {
  commander: Ship;
  subordinates: Array<Ship | Fleet>;
}
export interface FleetOverlayComponentProps {
  fleets: Fleet[];
  unassigned: Ship[];
  selected: number[];
  onContextMenu: (
    _id: number,
    _event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSelect: (_id: number) => void;
  onFocus: () => void;
}

function isFleet(value: Fleet | Ship): value is Fleet {
  return (value as Fleet).subordinates !== undefined;
}

function hasSelectedSubordinate(fleet: Fleet, selected: number[]): boolean {
  return fleet.subordinates.some((subordinate) =>
    isFleet(subordinate)
      ? hasSelectedSubordinate(subordinate, selected) ||
        selected.includes(subordinate.commander.id)
      : selected.includes(subordinate.id)
  );
}

interface FleetComponentProps {
  fleet: Fleet;
  level?: number;
  selected: number[];
  onSelect: (_id: number) => void;
  onFocus: () => void;
  onContextMenu: (
    _id: number,
    _event: React.MouseEvent<HTMLButtonElement>
  ) => void;
}

const FleetComponent: React.FC<FleetComponentProps> = ({
  fleet,
  level = 1,
  selected,
  onSelect,
  onFocus,
  onContextMenu,
}) => {
  const [expanded, setExpanded] = React.useState(
    hasSelectedSubordinate(fleet, selected)
  );

  return (
    <div>
      <div className={styles.fleetCommander}>
        <IconButton
          className={clsx(styles.fleetExpand, {
            [styles.fleetExpanded]: expanded,
          })}
          onClick={() => setExpanded((prevExpanded) => !prevExpanded)}
          variant="naked"
        >
          <ChevronDownIcon />
        </IconButton>
        <ShipButton
          key={fleet.commander.id}
          ship={fleet.commander}
          selected={selected.includes(fleet.commander.id)}
          onFocus={onFocus}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      </div>
      {expanded && (
        <div
          className={styles.fleetSubordinates}
          style={{
            marginLeft: `calc(${3} * usesize(1))`,
          }}
        >
          {fleet.subordinates
            .sort((a, b) =>
              isFleet(a) && !isFleet(b)
                ? -1
                : isFleet(b) && !isFleet(a)
                ? 1
                : isFleet(a) && isFleet(b)
                ? a.commander.cp.name.value.localeCompare(
                    b.commander.cp.name.value
                  )
                : (a as Ship).cp.name.value.localeCompare(
                    (b as Ship).cp.name.value
                  )
            )
            .map((subordinate) =>
              isFleet(subordinate) ? (
                <div key={subordinate.commander.id}>
                  <FleetComponent
                    fleet={subordinate}
                    level={level + 1}
                    selected={selected}
                    onSelect={onSelect}
                    onFocus={onFocus}
                    onContextMenu={onContextMenu}
                  />
                </div>
              ) : (
                <ShipButton
                  className={styles.shipMargin}
                  key={subordinate.id}
                  ship={subordinate}
                  selected={selected.includes(subordinate.id)}
                  onFocus={onFocus}
                  onSelect={onSelect}
                  onContextMenu={onContextMenu}
                />
              )
            )}
        </div>
      )}
    </div>
  );
};

export const FleetOverlayComponent: React.FC<FleetOverlayComponentProps> = ({
  fleets,
  unassigned,
  selected,
  onSelect,
  onContextMenu,
  onFocus,
}) => (
  <div className={styles.root}>
    <div>
      <Text variant="h2" color="primary">
        Active Fleets
      </Text>
      {fleets.length === 0
        ? "You currently have no fleets"
        : fleets.map((fleet) => (
            <FleetComponent
              key={fleet.commander.id}
              fleet={fleet}
              onSelect={onSelect}
              selected={selected}
              onFocus={onFocus}
              onContextMenu={onContextMenu}
            />
          ))}

      {unassigned.length > 0 && (
        <>
          <hr className={styles.hr} />
          <Text variant="h2" color="primary">
            Unassigned Ships
          </Text>
          <div>
            {unassigned.map((ship) => (
              <ShipButton
                key={ship.id}
                ship={ship}
                selected={selected.includes(ship.id)}
                onFocus={onFocus}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);
