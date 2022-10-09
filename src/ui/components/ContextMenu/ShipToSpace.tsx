import { matrix, norm, subtract } from "mathjs";
import React from "react";
import { AsteroidField } from "../../../archetypes/asteroidField";
import { createMarker } from "../../../archetypes/marker";
import { mineOrder } from "../../../components/orders";
import { isOwnedByPlayer } from "../../../components/player";
import { getSelected } from "../../../components/selection";
import { moveToOrders } from "../../../utils/moving";
import { useContextMenu, useSim } from "../../atoms";
import { DropdownOption } from "../Dropdown";
import { NoAvailableActions } from "./NoAvailableActions";

export const ShipToSpace: React.FC = () => {
  const [sim] = useSim();
  const [menu] = useContextMenu();
  const selected = getSelected(sim)!;
  const canBeOrdered =
    isOwnedByPlayer(selected) &&
    selected?.hasComponents(["orders", "position"]);

  if (!canBeOrdered) {
    return <NoAvailableActions />;
  }

  const fieldsToMine = selected.cp.mining
    ? sim.queries.asteroidFields
        .get()
        .filter(
          (field) =>
            norm(
              subtract(field.cp.position.coord, matrix(menu.worldPosition))
            ) < field.cp.asteroidSpawn.size
        )
    : [];

  const entity = selected!.requireComponents(["orders", "position"]);

  const onMove = () => {
    entity.cp.orders!.value.push({
      origin: "manual",
      type: "move",
      orders: moveToOrders(
        entity,
        createMarker(sim, {
          sector: menu.sector!.id,
          value: matrix(menu.worldPosition),
        })
      ),
    });
  };

  const onMine = (field: AsteroidField) => {
    entity.cp.orders!.value.push({
      origin: "manual",
      type: "mine",
      orders: [
        ...moveToOrders(entity, field),
        mineOrder({
          targetFieldId: field.id,
          targetRockId: null,
        }),
      ],
    });
  };

  return (
    <>
      <DropdownOption onClick={onMove}>Move</DropdownOption>
      {fieldsToMine.length > 0 &&
        fieldsToMine.map((field) => (
          <DropdownOption key={field.id} onClick={() => onMine(field)}>
            Mine {field.cp.asteroidSpawn.type}
          </DropdownOption>
        ))}
    </>
  );
};

ShipToSpace.displayName = "ShipToSpace";
