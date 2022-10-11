import React from "react";
import { Ship } from "../../archetypes/ship";
import { MineOrder, Order, OrderGroup } from "../../components/orders";
import { commodities } from "../../economy/commodity";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleSummary,
} from "./Collapsible";
import { Docks } from "./Docks";
import { Sim } from "../../sim";
import { asteroidField } from "../../archetypes/asteroidField";
import AutoOrder from "./AutoOrder";
import { Commander } from "./Commander";

function getOrderDescription(ship: Ship, order: Order) {
  switch (order.type) {
    case "move":
      return "Go to location";
    case "teleport":
      return "Teleport to location";
    case "trade":
      if (order.targetId === ship.cp.commander?.id)
        return "Deliver wares to commander";
      return order.offer.type === "sell"
        ? `Deliver wares to ${
            ship.sim.getOrThrow(order.targetId).cp.name?.value
          }`
        : `Get wares from ${
            ship.sim.getOrThrow(order.targetId).cp.name?.value
          }`;
    case "mine":
      return `Mine ${
        ship.sim
          .getOrThrow(order.targetFieldId)
          .requireComponents(["asteroidSpawn"]).cp.asteroidSpawn.type
      }`;
    case "dock":
      if (order.targetId === ship.cp.commander?.id)
        return "Dock at commanding facility";
      return `Dock at ${ship.sim.getOrThrow(order.targetId).cp.name?.value}`;
    default:
      return "Hold position";
  }
}

function getOrderGroupDescription(order: OrderGroup, sim: Sim) {
  switch (order.type) {
    case "move":
      return "Go to location";
    case "trade":
      return "Trade";
    case "mine":
      return `Mine ${
        asteroidField(
          sim.getOrThrow(
            (order.orders.find((o) => o.type === "mine") as MineOrder)!
              .targetFieldId
          )
        ).cp.asteroidSpawn.type
      }`;
    default:
      return "Hold position";
  }
}

const ShipPanel: React.FC<{ entity: Ship }> = ({ entity: ship }) => {
  const storedCommodities = Object.values(commodities).filter(
    (commodity) => ship.cp.storage.availableWares[commodity] > 0
  );
  const commander = ship.cp.commander?.id
    ? ship.sim.get(ship.cp.commander?.id)
    : null;

  return (
    <div>
      {!!commander && (
        <Commander
          commander={commander}
          ship={ship.requireComponents(["commander"])}
        />
      )}
      <hr />
      {storedCommodities.length > 0
        ? storedCommodities
            .map((commodity) => ({
              commodity,
              stored: ship.cp.storage.availableWares[commodity],
            }))
            .map((data) => (
              <div
                key={data.commodity}
              >{`${data.commodity}: ${data.stored}`}</div>
            ))
        : "Empty storage"}
      <hr />
      {ship.hasComponents(["autoOrder"]) && (
        <>
          <AutoOrder entity={ship.requireComponents(["autoOrder"])} />
          <hr />
        </>
      )}
      {ship.cp.orders.value.length === 0
        ? "No orders"
        : ship.cp.orders.value.map((order, orderIndex) => (
            <Collapsible key={`${order.type}-${orderIndex}`}>
              <CollapsibleSummary>
                {getOrderGroupDescription(order, ship.sim)}
              </CollapsibleSummary>
              <CollapsibleContent>
                {order.orders.map((o, index) => (
                  <div key={o.type + index}>{getOrderDescription(ship, o)}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
      <hr />
      {!!ship.cp.docks && <Docks entity={ship.requireComponents(["docks"])} />}
    </div>
  );
};

export default ShipPanel;
