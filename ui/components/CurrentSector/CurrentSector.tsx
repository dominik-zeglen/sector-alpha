import React from "react";
import Text from "@kit/Text";
import styles from "./styles.scss";

export interface CurrentSectorProps {
  name: string;
  owner?: string;
  color?: string;
}

export const CurrentSector = React.memo<CurrentSectorProps>(
  ({ name, owner, color }) => (
    <div className={styles.root}>
      <Text className={styles.text}>{name}</Text>
      {!!owner && (
        <Text
          className={styles.text}
          variant="caption"
          style={{ color: color ?? "var(--palette-text-3)" }}
        >
          {owner}
        </Text>
      )}
    </div>
  )
);
