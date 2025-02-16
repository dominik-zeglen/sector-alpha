import React from "react";
import clsx from "clsx";
import { BaseButton } from "@kit/BaseButton";
import type { RequirePureComponent } from "@core/tsHelpers";
import SVG from "react-inlinesvg";
import * as icons from "@assets/icons";
import Color from "color";
import styles from "./styles.scss";

type Ship = RequirePureComponent<"name" | "autoOrder">;

interface ShipButtonProps {
  className?: string;
  ship: Ship;
  selected: boolean;
  onSelect: (_id: number) => void;
  onFocus: () => void;
  onContextMenu: (
    _id: number,
    _event: React.MouseEvent<HTMLButtonElement>
  ) => void;
}

export const ShipButton: React.FC<ShipButtonProps> = ({
  className,
  ship,
  selected,
  onSelect,
  onFocus,
  onContextMenu,
}) => (
  <BaseButton
    className={clsx(styles.ship, className, {
      [styles.shipActive]: selected,
    })}
    onClick={() => onSelect(ship.id)}
    onDoubleClick={onFocus}
    onContextMenu={(event) => onContextMenu(ship.id, event)}
  >
    {ship.cp.render && (
      <SVG
        className={styles.shipIcon}
        style={{ color: Color(ship.cp.render.color).toString() }}
        src={icons[ship.cp.render.texture]}
      />
    )}
    {ship.cp.name.value}
    <span className={styles.shipOrder}>{ship.cp.autoOrder.default.type}</span>
  </BaseButton>
);
