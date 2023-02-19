import { add, matrix, random } from "mathjs";
import React from "react";
import { createMarker } from "@core/archetypes/marker";
import { isOwnedByPlayer } from "@core/components/player";
import { getSelected, getSelectedSecondary } from "@core/components/selection";
import { moveToActions } from "@core/utils/moving";
import { DropdownOption } from "@kit/Dropdown";
import { relationThresholds } from "@core/components/relations";
import { useContextMenu, useGameDialog, useSim } from "../../atoms";
import { NoAvailableActions } from "./NoAvailableActions";

export const ShipToEntity: React.FC = () => {
  const [sim] = useSim();
  const [menu] = useContextMenu();
  const selected = getSelected(sim)!;

  if (!selected) {
    return null;
  }

  const actionable = getSelectedSecondary(sim)!;
  const canBeOrdered =
    isOwnedByPlayer(selected) &&
    selected?.hasComponents(["orders", "position"]);
  const [, setDialog] = useGameDialog();

  if (!canBeOrdered) {
    return <NoAvailableActions />;
  }

  const entity = selected!.requireComponents(["orders", "position"]);
  const actionableRelationship = actionable.cp.owner?.id
    ? sim.queries.player.get()[0].cp.relations.values[actionable.cp.owner?.id]
    : 0;

  const onTrade = () => {
    setDialog({
      type: "trade",
      initiator: selected.id,
      target: actionable.id,
    });
  };

  const onDock = () => {
    entity.cp.orders!.value.push({
      origin: "manual",
      type: "dock",
      actions: [
        ...moveToActions(
          entity,
          createMarker(sim, {
            sector: menu.sector!.id,
            value: matrix(menu.worldPosition),
          })
        ),
        { type: "dock", targetId: actionable.id },
      ],
    });
  };

  const onFollow = () => {
    entity.cp.orders!.value.push({
      origin: "manual",
      type: "follow",
      targetId: actionable.id,
      actions: [],
      ordersForSector: 0,
    });
  };

  const onWorkFor = () => {
    entity.cp.orders!.value = [];
    entity.addComponent({
      name: "commander",
      id: actionable.id,
    });
  };

  const onBuild = () => {
    entity.cp.orders!.value.push({
      actions: [
        ...moveToActions(
          entity,
          createMarker(entity.sim, {
            sector: actionable.cp.position.sector,
            value: add(
              actionable.cp.position.coord,
              matrix([random(-1, 1), random(-1, 1)])
            ),
          })
        ),
        {
          type: "deployBuilder",
          targetId: actionable.id,
        },
      ],
      origin: "manual",
      type: "deployBuilder",
    });
  };

  return (
    <>
      {actionable.hasComponents(["trade"]) &&
        actionableRelationship > relationThresholds.trade && (
          <DropdownOption onClick={onTrade}>Trade</DropdownOption>
        )}
      {actionable.hasComponents(["docks"]) &&
        actionableRelationship > relationThresholds.trade && (
          <DropdownOption onClick={onDock}>Dock</DropdownOption>
        )}
      {actionable.hasComponents(["drive"]) && (
        <DropdownOption onClick={onFollow}>Follow</DropdownOption>
      )}
      {entity.hasComponents(["storage"]) &&
        actionable.hasComponents(["trade", "name"]) &&
        isOwnedByPlayer(actionable) && (
          <DropdownOption onClick={onWorkFor}>
            Work for {actionable.cp.name!.value}
          </DropdownOption>
        )}
      {entity.hasComponents(["deployable"]) &&
        actionable.hasComponents(["facilityModuleQueue"]) &&
        isOwnedByPlayer(actionable) && (
          <DropdownOption onClick={onBuild}>Build</DropdownOption>
        )}
    </>
  );
};

ShipToEntity.displayName = "ShipToEntity";
