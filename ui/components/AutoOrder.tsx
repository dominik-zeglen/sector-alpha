import React from "react";
import type { RequireComponent } from "@core/tsHelpers";
import { Select, SelectButton, SelectOption, SelectOptions } from "@kit/Select";
import { IconButton } from "@kit/IconButton";
import Text from "@kit/Text";
import type { AutoOrder as AutoOrderType } from "@core/components/autoOrder";
import type { Sector } from "@core/archetypes/sector";
import { OKIcon } from "@assets/ui/icons";
import { useSim } from "../atoms";
import styles from "./AutoOrder.scss";

const AutoOrder: React.FC<{
  entity: RequireComponent<"autoOrder" | "position">;
}> = ({ entity }) => {
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

  const onOrderSelect = (type: AutoOrderType["default"]["type"]) => {
    if (type === "hold") {
      return setDefaultOrder({ type });
    }

    if (type === "escort") {
      return setDefaultOrder({ type, targetId: 0 });
    }

    if (type === "patrol" || type === "pillage") {
      return setDefaultOrder({
        type,
        sectorId: entity.cp.position.sector,
        clockwise: Math.random() > 0.5,
      });
    }

    return setDefaultOrder({ type, sectorId: entity.cp.position.sector });
  };

  const onSectorSelect = (id: string) =>
    setDefaultOrder(
      defaultOrder.type === "mine" ||
        defaultOrder.type === "trade" ||
        defaultOrder.type === "patrol"
        ? {
            ...defaultOrder,
            sectorId: Number(id),
          }
        : defaultOrder
    );

  if (sim.queries.player.get()[0].id !== entity.cp.owner?.id) {
    return <Text>Default Order: {entity.cp.autoOrder.default.type}</Text>;
  }

  return (
    <div className={styles.form}>
      <Text>Default Order:</Text>
      <Select
        className={styles.select}
        value={defaultOrder.type}
        onChange={onOrderSelect}
      >
        <SelectButton>{defaultOrder.type}</SelectButton>
        <SelectOptions>
          {(
            [
              "hold",
              "mine",
              "trade",
              "patrol",
            ] as AutoOrderType["default"]["type"][]
          ).map((type) => (
            <SelectOption key={type} value={type}>
              {type}
            </SelectOption>
          ))}
        </SelectOptions>
      </Select>
      {(defaultOrder.type === "mine" ||
        defaultOrder.type === "trade" ||
        defaultOrder.type === "patrol") &&
        (!entity.cp.commander || defaultOrder.type === "patrol") && (
          <Select
            className={styles.select}
            value={defaultOrder.sectorId?.toString() ?? ""}
            onChange={onSectorSelect}
          >
            <SelectButton>
              {defaultOrder.sectorId
                ? sim.getOrThrow<Sector>(defaultOrder.sectorId).cp.name.value
                : ""}
            </SelectButton>
            <SelectOptions>
              {entity.sim.queries.sectors.get().map((sector) => (
                <SelectOption key={sector.id} value={sector.id.toString()}>
                  {sector.cp.name.value}
                </SelectOption>
              ))}
            </SelectOptions>
          </Select>
        )}
      <IconButton
        disabled={defaultOrder === entity.cp.autoOrder.default}
        onClick={onSubmit}
      >
        <OKIcon />
      </IconButton>
    </div>
  );
};

export default AutoOrder;
