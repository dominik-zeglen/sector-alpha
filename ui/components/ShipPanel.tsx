import React from "react";
import type { Ship } from "@core/archetypes/ship";
import AutoOrder from "./AutoOrder";
import { Commander } from "./Commander";
import Orders from "./Orders";

const ShipPanel: React.FC<{ entity: Ship; showSensitive: boolean }> = ({
  entity: ship,
  showSensitive,
}) => {
  const commander = ship.cp.commander?.id
    ? ship.sim.get(ship.cp.commander?.id)
    : null;

  if (!showSensitive) return null;

  return (
    <>
      {!!commander && (
        <>
          <Commander
            commander={commander.requireComponents(["position"])}
            ship={ship.requireComponents(["commander", "orders"])}
          />
          <hr />
        </>
      )}
      {ship.hasComponents(["autoOrder"]) && (
        <>
          <AutoOrder
            entity={ship.requireComponents(["autoOrder", "position"])}
          />
          <hr />
        </>
      )}
      <Orders ship={ship} />
      <hr />
    </>
  );
};

export default ShipPanel;
