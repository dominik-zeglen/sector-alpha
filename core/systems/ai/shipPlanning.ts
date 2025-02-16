import type { ShipyardQueueItem } from "@core/components/shipyard";
import type { DockSize } from "@core/components/dockable";
import { relationThresholds } from "@core/components/relations";
import { addSubordinate } from "@core/components/subordinates";
import { removeCommander } from "@core/components/commander";
import { gameDay, getSubordinates } from "@core/utils/misc";
import { filter, map, pipe, toArray } from "@fxts/core";
import type { InitialShipInput } from "../../archetypes/ship";
import { createShipName, createShip } from "../../archetypes/ship";
import { mineableCommodities } from "../../economy/commodity";
import type { Sim } from "../../sim";
import { pickRandom } from "../../utils/generators";
import { perCommodity } from "../../utils/perCommodity";
import type { ShipRole } from "../../world/ships";
import { System } from "../system";
import type { Faction } from "../../archetypes/faction";
import type { Sector } from "../../archetypes/sector";
import { sector as asSector } from "../../archetypes/sector";
import type { Entity } from "../../entity";
import type { RequireComponent } from "../../tsHelpers";
import { notNull } from "../../utils/maps";

interface ShipRequest {
  trading: number;
  mining: number;
  facility?: RequireComponent<
    "position" | "facilityModuleQueue" | "modules" | "subordinates"
  >;
  sector?: Sector;
  patrols: number;
  fighters: number;
}

export function requestShip(
  faction: Faction,
  shipyard: RequireComponent<"shipyard" | "position">,
  role: ShipRole,
  queue: boolean,
  size?: DockSize
): Omit<InitialShipInput, "position" | "owner" | "sector"> | null {
  const bp = pickRandom(
    faction.cp.blueprints.ships.filter(
      (ship) =>
        ship.role === role &&
        (size
          ? ship.size === size
          : ship.size !== "medium"
          ? Math.random() > 0.5
          : true)
    )
  );

  if (!bp) return null;

  if (queue) {
    shipyard.cp.shipyard.queue.push({
      blueprint: bp,
      owner: faction.id,
    });
  } else {
    createShip(faction.sim, {
      ...bp,
      position: shipyard.cp.position.coord.clone(),
      owner: faction,
      sector: asSector(shipyard.sim.getOrThrow(shipyard.cp.position.sector)),
      name: bp.name,
    });
  }

  return bp;
}

function assignSmallPatrol(
  fighters: RequireComponent<"position" | "model" | "orders" | "owner">[]
) {
  const commanders = fighters
    .filter((f) => f.tags.has("ai:spare"))
    .map((f) => f.requireComponents(["position", "autoOrder", "subordinates"]));

  for (const fighter of fighters) {
    if (commanders.some((cmdr) => cmdr.id === fighter.id)) return;

    fighter.addTag("ai:spare");

    const commander = commanders.find(
      (cmd) =>
        cmd.cp.autoOrder!.default.type === "patrol" &&
        cmd.cp.autoOrder!.default.sectorId === fighter.cp.position.sector
    );

    if (commander) {
      addSubordinate(commander, fighter);
      fighter.requireComponents(["autoOrder"]).cp.autoOrder.default = {
        type: "escort",
        targetId: commander.id,
      };
    } else {
      let sector = fighter.sim.getOrThrow(fighter.cp.position.sector);
      if (sector.cp.owner?.id !== fighter.cp.owner.id) {
        sector = pickRandom(
          fighter.sim.index.sectors
            .get()
            .filter((s) => s.cp.owner?.id === fighter.cp.owner.id)
        );
      }
      if (!sector) return;

      fighter.addComponent({
        name: "autoOrder",
        default: {
          type: "patrol",
          sectorId: sector.id,
          clockwise: Math.random() > 0.5,
        },
      });
      commanders.push(
        fighter.requireComponents(["position", "autoOrder", "subordinates"])
      );
    }
  }
}

export class ShipPlanningSystem extends System<"plan"> {
  apply = (sim: Sim) => {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  getFacilityShipRequests = (faction: Faction): ShipRequest[] =>
    pipe(
      this.sim.index.facilities.getIt(),
      filter((facility) => facility.cp.owner?.id === faction.id),
      map((facility) => {
        const facilityModules = facility.cp.modules.ids.map(
          this.sim.getOrThrow
        );
        const facilityShips = getSubordinates(facility);
        const miners = facilityShips
          .filter((ship) => ship.cp.mining)
          .map((miner) => miner.requireComponents(["commander", "mining"]));
        const traders = facilityShips.filter((ship) => !ship.cp.mining);
        const production = perCommodity((commodity) =>
          facilityModules
            .filter(
              (fm) =>
                fm.cp.production &&
                (fm.cp.production.pac[commodity].consumes > 0 ||
                  fm.cp.production.pac[commodity].produces > 0)
            )
            .reduce(
              (b, fm) =>
                b +
                (fm.cp.production!.pac[commodity].produces -
                  fm.cp.production!.pac[commodity].consumes) /
                  3600,
              0
            )
        );
        const shipsForShipyards = facility.cp.shipyard ? 2 : 0;

        const mining =
          Object.entries(production)
            .filter(
              ([commodity, commodityProduction]) =>
                commodityProduction < 0 &&
                (Object.values(mineableCommodities) as string[]).includes(
                  commodity
                )
            )
            .reduce(
              (m, [, commodityProduction]) =>
                m - Math.max(-1, -commodityProduction / 4),
              0
            ) + miners.length;

        const shipsForProduction =
          Math.floor(
            Object.entries(production).filter(
              ([commodity, commodityUsage]) =>
                !(Object.values(mineableCommodities) as string[]).includes(
                  commodity
                ) && commodityUsage !== 0
            ).length / 1.5
          ) || 1;

        const trading =
          traders.length - (shipsForProduction + shipsForShipyards);

        return { facility, mining, trading, patrols: 0, fighters: 0 };
      }),
      toArray
    );

  getPatrolRequests = (faction: Faction): ShipRequest[] =>
    this.sim.index.sectors
      .get()
      .filter((sector) => sector.cp.owner?.id === faction.id)
      .map((sector) => {
        const sectorPatrols = this.sim.index.ships
          .get()
          .filter(
            (ship) =>
              ship.cp.owner?.id === faction.id &&
              ship.cp.dockable?.size === "medium" &&
              ship.cp.orders.value.some(
                (order) =>
                  order.type === "patrol" && order.sectorId === sector?.id
              )
          );
        const sectorPatrolsFollowers = sectorPatrols.flatMap((ship) =>
          getSubordinates(ship)
            .filter((subordinate) => subordinate.tags.has("role:military"))
            .filter((subordinate) => subordinate.cp.dockable.size === "small")
        ).length;

        return {
          sector,
          patrols: sectorPatrols.length - faction.cp.ai!.patrols.perSector,
          fighters:
            sectorPatrolsFollowers -
            faction.cp.ai!.patrols.perSector *
              faction.cp.ai!.patrols.formation.fighters,
          trading: 0,
          mining: 0,
        };
      });

  getTravellingTradersRequests = (faction: Faction): ShipRequest[] => {
    if (faction.cp.ai?.type === "travelling") {
      return this.sim.index.shipyards
        .get()
        .filter(
          (shipyard) =>
            faction.cp.relations.values[shipyard.cp.owner.id] >
            relationThresholds.trade
        )
        .map((shipyard) =>
          this.sim.getOrThrow<Sector>(shipyard.cp.position.sector)
        )
        .map((sector) => {
          const sectorTraders = this.sim.index.autoOrderable
            .get()
            .filter(
              (ship) =>
                ship.cp.owner?.id === faction.id &&
                ship.cp.autoOrder.default.type === "trade" &&
                ship.cp.autoOrder.default.sectorId === sector.id
            ).length;

          return {
            trading: sectorTraders - 5,
            sector,
            fighters: 0,
            mining: 0,
            patrols: 0,
          };
        });
    }

    return [];
  };

  getShipRequests = (faction: Faction): ShipRequest[] => [
    ...this.getFacilityShipRequests(faction),
    ...this.getPatrolRequests(faction),
    ...this.getTravellingTradersRequests(faction),
  ];

  assignTraders = (
    faction: Faction,
    shipRequests: ShipRequest[],
    requestsInShipyards: ShipyardQueueItem[],
    shipyard: RequireComponent<"shipyard" | "position">
  ) => {
    const spareTraders: RequireComponent<"model" | "orders">[] = shipRequests
      .filter((request) => request.trading > 0 && request.facility)
      .flatMap(({ facility, trading }) =>
        getSubordinates(facility!)
          .filter((ship) => ship.tags.has("role:transport"))
          .slice(0, -trading)
      );
    spareTraders.forEach((ship) => {
      removeCommander(ship.requireComponents(["commander", "orders"]));
    });
    spareTraders.push(
      ...this.sim.index.orderable
        .get()
        .filter(
          (ship) =>
            ship.cp.owner?.id === faction.id &&
            (ship.cp.autoOrder
              ? ship.cp.autoOrder.default.type === "hold"
              : true) &&
            !ship.cp.commander &&
            ship.tags.has("role:transport")
        )
    );

    const shipRequestInShipyards = requestsInShipyards.filter(
      (queued) => queued && queued?.blueprint.role === "transport"
    );

    shipRequests
      .filter(({ trading, facility }) => trading < 0 && facility)
      .forEach(({ facility, trading }) => {
        for (let i = 0; i < -trading; i++) {
          if (spareTraders.length > 0 && facility) {
            const ship = spareTraders.pop()!;
            addSubordinate(facility, ship);
            ship.addComponent({
              name: "autoOrder",
              default: {
                type: "trade",
              },
            });
            ship.cp.name!.value = createShipName(ship);
          } else if (shipRequestInShipyards.length > 0) {
            shipRequestInShipyards.pop();
          } else {
            requestShip(faction, shipyard, "transport", this.sim.getTime() > 0);
          }
        }
      });

    shipRequests
      .filter(({ trading, sector }) => trading < 0 && sector)
      .forEach(({ sector, trading }) => {
        for (let i = 0; i < -trading; i++) {
          if (spareTraders.length > 0) {
            const ship = spareTraders.pop()!;
            ship.addComponent({
              name: "autoOrder",
              default: {
                type: "trade",
                sectorId: sector!.id,
              },
            });
            ship.cp.name!.value = createShipName(ship, "Trader");
          } else if (shipRequestInShipyards.length > 0) {
            shipRequestInShipyards.pop();
          } else {
            requestShip(faction, shipyard, "transport", this.sim.getTime() > 0);
          }
        }
      });
  };

  assignMiners = (
    faction: Faction,
    shipRequests: ShipRequest[],
    requestsInShipyards: ShipyardQueueItem[],
    shipyard: RequireComponent<"shipyard" | "position">
  ) => {
    const spareMiners: Entity[] = shipRequests
      .filter((request) => request.mining >= 1)
      .flatMap(
        ({ facility, mining }) =>
          getSubordinates(facility!)
            .filter((ship) => ship.tags.has("role:mining"))
            .slice(0, -mining) ?? []
      );
    spareMiners.forEach((ship) => {
      removeCommander(ship.requireComponents(["commander", "orders"]));
    });
    spareMiners.push(
      ...this.sim.index.mining
        .get()
        .filter(
          (ship) => ship.cp.owner?.id === faction.id && !ship.cp.commander
        )
    );

    const miningShipRequests = shipRequests.filter(({ mining }) => mining < 0);

    if (miningShipRequests.length === 0) return;

    const miningShipRequestInShipyards = requestsInShipyards.filter(
      (queued) => queued?.blueprint.mining
    );

    miningShipRequests.forEach(({ facility, mining }) => {
      while (mining < 0) {
        if (spareMiners.length > 0 && facility) {
          const ship = spareMiners.pop()!;
          addSubordinate(facility, ship);
          mining += ship.cp.mining!.efficiency;
        } else if (miningShipRequestInShipyards.length > 0) {
          mining += miningShipRequestInShipyards.pop()!.blueprint.mining;
        } else {
          const bp = requestShip(
            faction,
            shipyard,
            "mining",
            this.sim.getTime() > 0
          );
          mining += bp?.mining ?? 0;
        }
      }
    });
  };

  assignPatrols = (
    faction: Faction,
    shipRequests: ShipRequest[],
    requestsInShipyards: ShipyardQueueItem[],
    shipyard: RequireComponent<"shipyard" | "position">
  ) => {
    const spareFrigates = shipRequests
      .filter(({ patrols }) => patrols > 0)
      .flatMap(({ sector, patrols }) =>
        this.sim.index.ships
          .get()
          .filter(
            (ship) =>
              ship.cp.owner?.id === faction.id &&
              ship.cp.dockable?.size === "medium" &&
              ship.cp.orders.value.some(
                (order) =>
                  order.type === "patrol" && order.sectorId === sector?.id
              )
          )
          .slice(0, patrols)
      );

    spareFrigates.push(
      ...this.sim.index.ships
        .get()
        .filter(
          (ship) =>
            ship.cp.owner?.id === faction.id &&
            !ship.cp.commander &&
            ship.cp.dockable?.size === "medium" &&
            ship.tags.has("role:military") &&
            !ship.tags.has("ai:attack-force") &&
            (ship.cp.orders.value.length === 0 || ship.tags.has("ai:spare"))
        )
    );

    const frigatesInShipyards = requestsInShipyards.filter(
      (queued) =>
        queued?.blueprint.role === "military" &&
        queued?.blueprint.size === "medium"
    );

    shipRequests
      .filter(({ sector, patrols }) => sector && patrols < 0)
      .forEach(({ sector, patrols }) => {
        for (let i = 0; i < -patrols; i++) {
          if (spareFrigates.length > 0 && sector) {
            const ship = spareFrigates.pop()!;
            ship.tags.delete("ai:spare");
            if (faction.cp.name.slug !== "TAU") {
              ship.cp.name.value = createShipName(ship, "Patrol Leader");
            }
            ship.cp.orders!.value = [
              {
                type: "patrol",
                origin: "auto",
                sectorId: sector!.id,
                actions: [],
                clockwise: Math.random() > 0.5,
              },
            ];
          } else if (frigatesInShipyards.length > 0) {
            frigatesInShipyards.pop();
          } else {
            requestShip(
              faction,
              shipyard,
              "military",
              this.sim.getTime() > 0,
              "medium"
            );
          }
        }
      });

    const spareFighters = this.sim.index.orderable
      .get()
      .filter(
        (ship) =>
          ship.cp.owner?.id === faction.id &&
          !ship.cp.commander &&
          ship.cp.dockable?.size === "small" &&
          ship.tags.has("role:military") &&
          !ship.tags.has("ai:attack-force") &&
          (ship.cp.orders.value.length === 0 || ship.tags.has("ai:spare"))
      );

    const fightersInShipyards = requestsInShipyards.filter(
      (queued) =>
        queued?.blueprint.role === "military" &&
        queued?.blueprint.size === "small"
    );

    shipRequests
      .filter(({ fighters }) => fighters < 0)
      .forEach(({ fighters }) => {
        for (let i = 0; i < -fighters; i++) {
          if (spareFighters.length > 0) {
            const ship = spareFighters.pop()!;
            ship.tags.delete("ai:spare");
            const commander = this.sim.index.ships
              .get()
              .find(
                (patrolLeader) =>
                  patrolLeader.cp.owner?.id === faction.id &&
                  patrolLeader.cp.dockable?.size === "medium" &&
                  patrolLeader.cp.orders.value.some(
                    (order) => order.type === "patrol"
                  ) &&
                  getSubordinates(patrolLeader).length <
                    faction.cp.ai!.patrols.formation.fighters
              );

            if (commander) {
              ship.cp.orders!.value = [
                {
                  type: "escort",
                  origin: "auto",
                  targetId: commander.id,
                  actions: [],
                  ordersForSector: 0,
                },
              ];
              if (ship.cp.autoOrder) {
                ship.cp.autoOrder.default = {
                  type: "escort",
                  targetId: commander.id,
                };
              }
              addSubordinate(commander, ship);
            } else {
              spareFighters.push(ship);
            }
          } else if (fightersInShipyards.length > 0) {
            fightersInShipyards.pop();
          } else {
            requestShip(
              faction,
              shipyard,
              "military",
              this.sim.getTime() > 0,
              "small"
            );
          }
        }
      });

    assignSmallPatrol(spareFighters);
  };

  exec = (): void => {
    if (this.cooldowns.canUse("plan")) {
      this.cooldowns.use("plan", gameDay);

      this.sim.index.ai.get().forEach((faction) => {
        const shipRequests = this.getShipRequests(faction);
        const requestsInShipyards = this.sim.index.shipyards
          .get()
          .flatMap((shipyard) =>
            [...shipyard.cp.shipyard.queue, shipyard.cp.shipyard.building]
              .filter(notNull)
              .filter((queueItem) => queueItem.owner === faction.id)
          );
        const shipyard =
          this.sim.index.shipyards
            .get()
            .find((s) => s.cp.owner.id === faction.id) ??
          pickRandom(
            this.sim.index.shipyards
              .get()
              .filter(
                (s) =>
                  this.sim.getOrThrow<Faction>(s.cp.owner.id).cp.relations
                    .values[faction.id] >= relationThresholds.shipyard
              )
          );

        [this.assignTraders, this.assignMiners, this.assignPatrols].forEach(
          (fn) => fn(faction, shipRequests, requestsInShipyards, shipyard)
        );
      });
    }
  };
}

export const shipPlanningSystem = new ShipPlanningSystem();
