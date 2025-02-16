import { Button } from "@kit/Button";
import type { DialogProps } from "@kit/Dialog";
import Text from "@kit/Text";
import clsx from "clsx";
import React from "react";
import uniq from "lodash/uniq";
import type { GameOverlayType } from "@ui/state/game";
import { useGameStore } from "@ui/state/game";
import styles from "./Overlay.scss";

const OverlayContext = React.createContext<(_name: GameOverlayType) => void>(
  () => undefined
);

export const useOverlayRegister = (slug: GameOverlayType) => {
  const register = React.useContext(OverlayContext);
  React.useEffect(() => {
    register(slug);
  }, []);
};

export interface OverlayProps extends DialogProps {
  active: string | null;
}

const overlayNames: Record<NonNullable<GameOverlayType>, string> = {
  fleet: "Fleet Management",
  missions: "Active Missions",
  map: "Strategic Map",
  dev: "Developer Tools",
};

export const Overlay: React.FC<OverlayProps> = ({
  open,
  active,
  onClose,
  children,
}) => {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const [overlays, setOverlays] = React.useState<GameOverlayType[]>([]);
  const [[activeOverlay], gameStore] = useGameStore((store) => [store.overlay]);
  const register = React.useCallback(
    (name: GameOverlayType) => setOverlays((prev) => uniq([...prev, name])),
    []
  );

  React.useEffect(() => {
    if (!container) return () => {};

    container.classList.add(open ? styles.fadeIn : styles.fadeOut);
    const onAnimationEnd = () => {
      container.classList.remove(styles.fadeIn, styles.fadeOut);
    };
    container.addEventListener("animationend", onAnimationEnd);

    return () => {
      container.removeEventListener("animationend", onAnimationEnd);
    };
  }, [open]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <OverlayContext.Provider value={register}>
      <div
        className={clsx(styles.root, {
          [styles.active]: open,
        })}
        id="overlay"
        data-open={open}
        data-active={activeOverlay ?? "none"}
        ref={setContainer}
      >
        <div className={styles.bar}>
          <Button type="button" onClick={onClose}>
            Back
          </Button>
          {overlays.map((slug) => (
            <Text
              variant="h3"
              color={active === slug ? "primary" : "default"}
              onClick={() => gameStore.setOverlay(slug)}
              key={slug}
            >
              {overlayNames[slug ?? ""]}
            </Text>
          ))}
        </div>
        {children}
      </div>
    </OverlayContext.Provider>
  );
};
