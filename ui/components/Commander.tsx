import React from "react";
import SVG from "react-inlinesvg";
import { Entity } from "@core/components/entity";
import { RequireComponent } from "@core/tsHelpers";
import locationIcon from "@assets/ui/location.svg";
import closeIcon from "@assets/ui/close.svg";
import { IconButton } from "@kit/IconButton";
import { useSim } from "../atoms";
import styles from "./Commander.scss";

export interface CommanderProps {
  commander: Entity;
  ship: RequireComponent<"commander">;
}

export const Commander: React.FC<CommanderProps> = ({ commander, ship }) => {
  const [sim] = useSim();
  const isOwned = sim.queries.player.get()[0].id === ship.cp.owner?.id;

  return (
    <div className={styles.root}>
      <span>{`Commander: ${commander.cp.name!.value}`}</span>
      <div>
        <IconButton
          className={styles.btn}
          onClick={() => {
            const { selectionManager } = ship.sim
              .find((e) => e.hasComponents(["selectionManager"]))!
              .requireComponents(["selectionManager"]).cp;

            selectionManager.id = commander.id;
            selectionManager.focused = true;
          }}
        >
          <SVG src={locationIcon} />
        </IconButton>
        {isOwned && (
          <IconButton
            className={styles.btn}
            onClick={() => {
              ship.removeComponent("commander");
            }}
          >
            <SVG src={closeIcon} />
          </IconButton>
        )}
      </div>
    </div>
  );
};
