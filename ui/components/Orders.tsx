import React from "react";
import SVG from "react-inlinesvg";
import { DockAction, MineAction, Action, Order } from "@core/components/orders";
import { asteroidField } from "@core/archetypes/asteroidField";
import { Ship } from "@core/archetypes/ship";
import { Sim } from "@core/sim";
import { isOwnedByPlayer } from "@core/components/player";
import closeIcon from "@assets/ui/close.svg";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleSummary,
} from "@kit/Collapsible";
import { IconButton } from "@kit/IconButton";
import styles from "./Orders.scss";

function getOrderDescription(ship: Ship, order: Action) {
  switch (order.type) {
    case "move":
      return `Go to ${
        ship.sim.get(order.targetId)?.cp.name?.value ?? "location"
      }`;
    case "teleport":
      return "Teleport to location";
    case "trade":
      return order.offer.type === "sell"
        ? order.targetId === ship.cp.commander?.id
          ? `Deliver ${order.offer.quantity}x ${order.offer.commodity} to commander`
          : `Deliver ${order.offer.quantity}x ${order.offer.commodity} to ${
              ship.sim.getOrThrow(order.targetId).cp.name?.value
            }`
        : `Get ${order.offer.quantity}x ${order.offer.commodity} from ${
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

function getOrderGroupDescription(order: Order, sim: Sim) {
  switch (order.type) {
    case "move":
      return "Move";
    case "trade":
      return "Trade";
    case "mine":
      return `Mine ${
        asteroidField(
          sim.getOrThrow(
            (order.actions.find((o) => o.type === "mine") as MineAction)!
              .targetFieldId
          )
        ).cp.asteroidSpawn.type
      }`;
    case "dock":
      return `Dock at ${
        sim.get(
          (order.actions.find((o) => o.type === "dock") as DockAction)!.targetId
        )?.cp.name?.value ?? "target"
      }`;
    case "follow":
      return `Follow ${sim.get(order.targetId)?.cp.name?.value ?? "target"}`;
    default:
      return "Hold position";
  }
}

const Orders: React.FC<{ ship: Ship }> = ({ ship }) => {
  if (ship.cp.orders.value.length === 0) {
    return <div>No orders</div>;
  }

  const isOwned = isOwnedByPlayer(ship);

  return (
    <>
      {ship.cp.orders.value.map((order, orderIndex) => (
        <Collapsible key={`${order.type}-${orderIndex}`}>
          <CollapsibleSummary>
            <div className={styles.orderGroupHeader}>
              {getOrderGroupDescription(order, ship.sim)}
              {isOwned && (
                <IconButton
                  onClick={(event) => {
                    event.stopPropagation();
                    ship.cp.orders.value.splice(orderIndex, 1);
                  }}
                >
                  <SVG src={closeIcon} />
                </IconButton>
              )}
            </div>
          </CollapsibleSummary>
          <CollapsibleContent>
            {order.actions.map((o, index) => (
              <div key={o.type + index}>{getOrderDescription(ship, o)}</div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </>
  );
};

export default Orders;
