import React from "react";
import SVG from "react-inlinesvg";
import { Action } from "@core/components/orders";
import { RequireComponent } from "@core/tsHelpers";
import okIcon from "@assets/ui/ok.svg";
import { Select, SelectButton, SelectOption, SelectOptions } from "@kit/Select";
import { IconButton } from "@kit/IconButton";
import Text from "@kit/Text";
import { useSim } from "../atoms";
import styles from "./AutoOrder.scss";

const AutoOrder: React.FC<{ entity: RequireComponent<"autoOrder"> }> = ({
  entity,
}) => {
  const [sim] = useSim();
  const [defaultOrder, setDefaultOrder] = React.useState(
    entity.cp.autoOrder.default
  );
  const reset = () => setDefaultOrder(entity.cp.autoOrder.default);

  React.useEffect(reset, [entity]);

  const onSubmit = () => {
    entity.cp.autoOrder.default = defaultOrder;
    reset();
  };

  if (sim.queries.player.get()[0].id !== entity.cp.owner?.id) {
    return <Text>Default Order: {entity.cp.autoOrder.default}</Text>;
  }

  return (
    <div className={styles.form}>
      <Text>Default Order:</Text>
      <Select
        className={styles.select}
        value={defaultOrder}
        onChange={setDefaultOrder}
      >
        <SelectButton>{defaultOrder}</SelectButton>
        <SelectOptions>
          {(["hold", "mine", "trade"] as Action["type"][]).map((type) => (
            <SelectOption key={type} value={type}>
              {type}
            </SelectOption>
          ))}
        </SelectOptions>
      </Select>
      <IconButton
        disabled={defaultOrder === entity.cp.autoOrder.default}
        onClick={onSubmit}
      >
        <SVG src={okIcon} />
      </IconButton>
    </div>
  );
};

export default AutoOrder;
