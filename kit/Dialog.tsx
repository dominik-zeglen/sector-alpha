import React from "react";
import Modal from "react-modal";
import { CloseIcon } from "@assets/ui/icons";
import { IconButton } from "./IconButton";
import Text from "./Text";
import styles from "./Dialog.scss";
import { AnimatedBackdrop } from "./AnimatedBackdrop";

try {
  Modal.setAppElement("#root");
  // eslint-disable-next-line no-empty
} catch {}

export interface DialogProps {
  children?: React.ReactNode;
  open: boolean;
  title?: string;
  width?: string;
  onClose: () => void;
}

export const Dialog: React.FC<
  Omit<DialogProps, "onClose"> & { onClose: (() => void) | null }
> = ({ children, title, open, width, onClose }) => (
  <Modal
    isOpen={open}
    onRequestClose={onClose ?? undefined}
    style={{
      content: {
        backgroundColor: "#080808",
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        maxWidth: `calc(100vw - ${"usesize(4)"})`,
        width: width ?? "300px",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)",
        borderColor: "var(--palette-active)",
        overflow: "unset",
        userSelect: "none",
        boxShadow: "0px 0px 23px -4px var(--palette-active)",
      },
      overlay: {
        backgroundColor: "rgb(0 0 0 / 85%)",
      },
    }}
  >
    <AnimatedBackdrop className={styles.backdrop}>
      {!!title && (
        <div className={styles.title}>
          <Text className={styles.titleText} variant="h1" color="primary">
            {title}
          </Text>
          {onClose && (
            <IconButton className={styles.close} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </div>
      )}
      {children}
    </AnimatedBackdrop>
  </Modal>
);
Dialog.displayName = "Dialog";
