import React from "react";
import Text from "@kit/Text";
import { useGameStore } from "@ui/state/game";
import styles from "./styles.scss";

export const SelectedUnit: React.FC = () => {
  const [[selectedUnits], gameStore] = useGameStore((store) => [
    store.selectedUnits,
  ]);

  if (!selectedUnits.length) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.panel} onDoubleClick={gameStore.focus}>
        {selectedUnits.length === 1 ? (
          <Text variant="caption">
            {selectedUnits[0].cp.name?.value ??
              (selectedUnits[0].hasTags(["collectible"])
                ? "Collectible"
                : "Unknown")}
          </Text>
        ) : (
          <Text variant="caption">
            {selectedUnits[0].cp.name?.value ??
              (selectedUnits[0].hasTags(["collectible"])
                ? "Collectible"
                : "Unknown")}{" "}
            and {selectedUnits.length - 1} more
          </Text>
        )}
      </div>
    </div>
  );
};

SelectedUnit.displayName = "SelectedUnit";
