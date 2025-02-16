import React from "react";
import type { Entity } from "@core/entity";
import type { RequireComponent } from "@core/tsHelpers";
import { IconButton } from "@kit/IconButton";
import { Button } from "@kit/Button";
import clsx from "clsx";
import { isOwnedByPlayer } from "@core/utils/misc";
import { RedoIcon } from "@assets/ui/icons";
import { gameStore } from "@ui/state/game";
import styles from "./Undeploy.scss";

export interface UndeployProps {
  facility: Entity | undefined;
  deployable: RequireComponent<"deployable" | "position">;
}

export const Undeploy: React.FC<UndeployProps> = ({ facility, deployable }) => {
  const isOwned = isOwnedByPlayer(deployable);

  if (!deployable.cp.deployable.active) return null;

  if (facility && deployable.cp.deployable.type === "builder") {
    return (
      <>
        <div className={styles.root}>
          <span>{`Building: ${facility.cp.name!.value}`}</span>
          <div>
            <IconButton
              className={styles.btn}
              onClick={() => {
                gameStore.setSelectedUnits([deployable]);
                gameStore.focus();
              }}
            >
              <RedoIcon />
            </IconButton>
          </div>
        </div>
        {isOwned && (
          <Button
            className={clsx(styles.btn, styles.btnDetach)}
            onClick={() => {
              deployable.cp.deployable.cancel = true;
            }}
          >
            Detach from facility
          </Button>
        )}
        <hr />
      </>
    );
  }

  return (
    <div className={styles.root}>
      <Button
        className={styles.btn}
        onClick={() => {
          deployable.cp.deployable.cancel = true;
        }}
      >
        Deactivate
      </Button>
    </div>
  );
};
