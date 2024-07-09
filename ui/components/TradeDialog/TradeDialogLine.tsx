import React from "react";
import { useFormContext } from "react-hook-form";
import { commodityLabel, type Commodity } from "@core/economy/commodity";
import { Button } from "@kit/Button";
import { Input } from "@kit/Input";
import { TableCell } from "@kit/Table";
import Text from "@kit/Text";
import styles from "./TradeDialog.scss";

export interface TradeDialogLineProps {
  buyDisabled: boolean;
  sellDisabled: boolean;
  commodity: Commodity;
  offerType: "buy" | "sell";
  price: number;
  availableQuantity: number;
  max: number;
  onAction: (() => void) | undefined;
}

export const TradeDialogLine: React.FC<TradeDialogLineProps> = ({
  buyDisabled,
  sellDisabled,
  commodity,
  max,
  offerType,
  price,
  availableQuantity,
  onAction,
}) => {
  const { register } = useFormContext();

  return (
    <tr className={styles.row} key={commodity}>
      <TableCell className={styles.colName}>
        {commodityLabel[commodity]}
      </TableCell>
      <TableCell>
        <Text variant="caption" color={buyDisabled ? "disabled" : "default"}>
          {offerType === "buy" ? price : "-"}
        </Text>
      </TableCell>
      <TableCell>
        <Text variant="caption" color={buyDisabled ? "disabled" : "default"}>
          {offerType === "buy" ? availableQuantity : "-"}
        </Text>
      </TableCell>
      <TableCell>
        <Text variant="caption" color={sellDisabled ? "disabled" : "default"}>
          {offerType === "sell" ? price : "-"}
        </Text>
      </TableCell>
      <TableCell>
        <Text variant="caption" color={sellDisabled ? "disabled" : "default"}>
          {offerType === "sell" ? availableQuantity : "-"}
        </Text>
      </TableCell>
      {!!onAction && (
        <TableCell>
          <Input
            className={styles.input}
            placeholder="0"
            type="number"
            max={max}
            min={0}
            {...register(commodity)}
          />
          <Text
            variant="caption"
            component="span"
            className={styles.max}
            color="text-3"
          >
            /{max}
          </Text>
          <Button className={styles.actionBtn} onClick={onAction}>
            {offerType === "buy" ? "sell" : "buy"}
          </Button>
        </TableCell>
      )}
    </tr>
  );
};
TradeDialogLine.displayName = "TradeDialogLine";
