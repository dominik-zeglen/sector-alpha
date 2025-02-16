import ClickAwayListener from "react-click-away-listener";
import { Dropdown, DropdownOptions } from "@kit/Dropdown";
import React from "react";
import { useContextMenuStore } from "@ui/state/contextMenu";
import styles from "./styles.scss";

export const Wrapper: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [[menu], menuStore] = useContextMenuStore((store) => [store.state]);

  return (
    <ClickAwayListener mouseEvent="mousedown" onClickAway={menuStore.close}>
      <div
        className={styles.menu}
        style={{ top: menu.position[1], left: menu.position[0] }}
      >
        <Dropdown onClick={menuStore.close}>
          <DropdownOptions static>{children}</DropdownOptions>
        </Dropdown>
      </div>
    </ClickAwayListener>
  );
};
