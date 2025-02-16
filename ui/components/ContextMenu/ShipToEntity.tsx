import React from "react";
import { createWaypoint } from "@core/archetypes/waypoint";
import { moveToActions } from "@core/utils/moving";
import { DropdownOption } from "@kit/Dropdown";
import { relationThresholds } from "@core/components/relations";
import { isOwnedByPlayer } from "@core/utils/misc";
import { addSubordinate } from "@core/components/subordinates";
import { findInAncestors } from "@core/utils/findInAncestors";
import { useGameStore } from "@ui/state/game";
import { useContextMenuStore } from "@ui/state/contextMenu";
import { useGameDialog, useSim } from "../../atoms";
import { NoAvailableActions } from "./NoAvailableActions";
import { Wrapper } from "./Wrapper";

export const ShipToEntity: React.FC = () => {
  const [sim] = useSim();
  const [[menu]] = useContextMenuStore((store) => [store.state]);
  const [[selected]] = useGameStore((store) => [store.selectedUnits]);

  if (!selected.length) {
    return null;
  }

  const canBeOrdered =
    isOwnedByPlayer(selected[0]) &&
    selected[0].hasComponents(["orders", "position"]);
  const [, setDialog] = useGameDialog();

  if (!canBeOrdered) {
    return (
      <Wrapper>
        <NoAvailableActions />
      </Wrapper>
    );
  }

  const actionableRelationship = menu.target!.cp.owner?.id
    ? sim.index.player.get()[0].cp.relations.values[menu.target!.cp.owner?.id]
    : 0;

  const onTrade = () => {
    setDialog({
      type: "trade",
      initiator: selected[0].id,
      target: menu.target!.id,
    });
  };

  const onDock = () => {
    for (const unit of selected) {
      unit.cp.orders!.value.push({
        origin: "manual",
        type: "dock",
        actions: [
          ...moveToActions(
            unit,
            createWaypoint(sim, {
              sector: menu.sector!.id,
              value: menu.worldPosition,
              owner: unit.id,
            })
          ),
          { type: "dock", targetId: menu.target!.id },
        ],
      });
    }
  };

  const onFollow = () => {
    for (const unit of selected) {
      unit.cp.orders!.value.push({
        origin: "manual",
        type: "follow",
        targetId: menu.target!.id,
        actions: [],
        ordersForSector: 0,
      });
    }
  };

  const onWorkFor = () => {
    for (const unit of selected) {
      unit.cp.orders!.value = [];
      addSubordinate(menu.target!.requireComponents(["subordinates"]), unit);
    }
  };

  const onBuild = () => {
    for (const unit of selected) {
      unit.cp.orders!.value.push({
        actions: [
          ...moveToActions(
            unit,
            createWaypoint(unit.sim, {
              sector: menu.target!.cp.position!.sector,
              value: menu.target!.cp.position!.coord,
              owner: unit.id,
            })
          ),
          {
            type: "deployBuilder",
            targetId: menu.target!.id,
          },
        ],
        origin: "manual",
        type: "deployBuilder",
      });
    }
  };

  const onAttack = () => {
    for (const unit of selected) {
      unit.cp.orders!.value.push({
        origin: "manual",
        type: "attack",
        targetId: menu.target!.id,
        actions: [],
        ordersForSector: 0,
        followOutsideSector: true,
      });
    }
  };

  const onCollect = () => {
    selected[0].cp.orders!.value.push({
      origin: "manual",
      type: "collect",
      actions: [
        ...moveToActions(
          selected[0],
          createWaypoint(selected[0].sim, {
            sector: menu.target!.cp.position!.sector,
            value: menu.target!.cp.position!.coord,
            owner: selected[0].id,
          })
        ),
        {
          type: "collect",
          targetId: menu.target!.id,
        },
      ],
    });
  };

  const onEscort = () => {
    for (const unit of selected) {
      addSubordinate(menu.target!.requireComponents(["subordinates"]), unit);
      unit.addComponent({
        name: "autoOrder",
        default: {
          type: "escort",
          targetId: menu.target!.id,
        },
      });
    }
  };

  const teleportModule = menu
    .target!.cp.modules?.ids.map(sim.getOrThrow)
    .find((e) => e.hasComponents(["teleport"]));

  const onTeleport = () => {
    for (const unit of selected) {
      unit.cp.orders!.value.push({
        origin: "manual",
        actions: moveToActions(
          unit,
          findInAncestors(
            sim.getOrThrow(
              teleportModule!.requireComponents(["teleport"]).cp.teleport
                .destinationId!
            ),
            "position"
          )
        ),
        type: "move",
      });
    }
  };

  if (teleportModule) {
    return (
      <Wrapper>
        <DropdownOption onClick={onTeleport}>Jump</DropdownOption>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {menu.target!.hasComponents(["trade"]) &&
        actionableRelationship > relationThresholds.trade &&
        selected.length === 1 && (
          <DropdownOption onClick={onTrade}>Trade</DropdownOption>
        )}
      {menu.target!.hasComponents(["docks"]) &&
        actionableRelationship > relationThresholds.trade && (
          <DropdownOption onClick={onDock}>Dock</DropdownOption>
        )}
      {menu.target!.hasComponents(["drive"]) && (
        <DropdownOption onClick={onFollow}>Follow</DropdownOption>
      )}
      {menu.target!.hasComponents(["drive", "subordinates"]) &&
        menu.target!.cp.owner?.id === selected[0].cp.owner?.id && (
          <DropdownOption onClick={onEscort}>Escort</DropdownOption>
        )}
      {selected.every((unit) => unit.hasComponents(["storage"])) &&
        menu.target!.hasComponents(["trade", "name", "subordinates"]) &&
        isOwnedByPlayer(menu.target!) && (
          <DropdownOption onClick={onWorkFor}>
            Work for {menu.target!.cp.name!.value}
          </DropdownOption>
        )}
      {selected.length === 1 &&
        selected[0].hasComponents(["deployable"]) &&
        menu.target!.hasComponents(["facilityModuleQueue"]) &&
        isOwnedByPlayer(menu.target!) && (
          <DropdownOption onClick={onBuild}>Build</DropdownOption>
        )}
      {selected.every((unit) => unit.hasComponents(["damage"])) &&
        menu.target!.hasComponents(["hitpoints"]) && (
          <DropdownOption onClick={onAttack}>Attack</DropdownOption>
        )}
      {selected.length === 1 &&
        selected[0].hasComponents(["storage"]) &&
        menu.target!.hasComponents(["simpleCommodityStorage"]) && (
          <DropdownOption onClick={onCollect}>Collect</DropdownOption>
        )}
    </Wrapper>
  );
};

ShipToEntity.displayName = "ShipToEntity";
