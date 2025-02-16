import React from "react";
import type { RequireComponent } from "@core/tsHelpers";
import { IconButton } from "@kit/IconButton";
import { removeCommander } from "@core/components/commander";
import { CloseIcon, RedoIcon } from "@assets/ui/icons";
import { useGameStore } from "@ui/state/game";
import { useSim } from "@ui/atoms";
import styles from "./Commander.scss";

export interface CommanderProps {
  commander: RequireComponent<"position">;
  ship: RequireComponent<"commander" | "orders">;
}

export const Commander: React.FC<CommanderProps> = ({ commander, ship }) => {
  const [sim] = useSim();
  const [, gameStore] = useGameStore(() => []);
  const isOwned = sim.index.player.get()[0].id === ship.cp.owner?.id;

  return (
    <div className={styles.root}>
      <span>{`Commander: ${commander.cp.name!.value}`}</span>
      <div>
        <IconButton
          className={styles.btn}
          onClick={() => {
            gameStore.setSelectedUnits([commander]);
            gameStore.focus();
          }}
        >
          <RedoIcon />
        </IconButton>
        {isOwned && (
          <IconButton
            className={styles.btn}
            onClick={() => {
              removeCommander(ship);
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
};
