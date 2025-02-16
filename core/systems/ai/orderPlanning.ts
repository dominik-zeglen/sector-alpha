import type { Faction } from "@core/archetypes/faction";
import { relationThresholds } from "@core/components/relations";
import minBy from "lodash/minBy";
import { random } from "mathjs";
import { filter, flatMap, map, pipe, sum, toArray } from "@fxts/core";
import { fromPolar, getRandomPositionInBounds } from "@core/utils/misc";
import { hecsToCartesian } from "@core/components/hecsPosition";
import { asteroidField } from "../../archetypes/asteroidField";
import { commanderRange, facility } from "../../archetypes/facility";
import type { Waypoint } from "../../archetypes/waypoint";
import { createWaypoint } from "../../archetypes/waypoint";
import type { Sector } from "../../archetypes/sector";
import { sector as asSector, sectorSize } from "../../archetypes/sector";
import type { MineOrder, TradeOrder } from "../../components/orders";
import { mineAction } from "../../components/orders";
import { dumpCargo, getAvailableSpace } from "../../components/storage";
import type { Commodity } from "../../economy/commodity";
import { mineableCommodities } from "../../economy/commodity";
import {
  getSectorsInTeleportRange,
  getTradeWithMostProfit,
  sellCommodityWithMostProfit,
  tradeComponents,
} from "../../economy/utils";
import type { Sim } from "../../sim";
import type { RequireComponent } from "../../tsHelpers";
import { moveToActions } from "../../utils/moving";
import {
  autoBuyMostNeededByCommander,
  autoSellMostRedundantToCommander,
  getCommoditiesForSell,
  getNeededCommodities,
  returnToFacility,
  resellCommodity,
  arrangeTrade,
} from "../../utils/trading";
import { holdPosition } from "../orderExecuting/misc";
import { System } from "../system";
import { tradingSystem } from "../trading";

const tradingComponents = [
  "drive",
  "storage",
  "autoOrder",
  "orders",
  "owner",
  "position",
  "dockable",
] as const;
type Trading = RequireComponent<(typeof tradingComponents)[number]>;

function idleMovement(entity: RequireComponent<"position" | "orders">) {
  const commander =
    entity.cp.commander &&
    entity.sim.getOrThrow<Waypoint>(entity.cp.commander.id);

  entity.cp.orders.value.push({
    origin: "OrderPlanningSystem:auto",
    actions: moveToActions(
      entity,
      createWaypoint(
        entity.sim,
        commander
          ? {
              sector: commander.cp.position.sector,
              value: fromPolar(random(0, 2 * Math.PI), random(0, 1)).add(
                commander.cp.position.coord
              ),
              owner: entity.id,
            }
          : {
              sector: entity.cp.position.sector,
              value: getRandomPositionInBounds(entity),
              owner: entity.id,
            }
      ),
      { onlyManeuver: true }
    ),
    type: "move",
  });
}

function autoTrade(entity: Trading, sectorDistance: number) {
  let makingTrade = false;
  const owner = entity.sim.getOrThrow<Faction>(entity.cp.owner.id);

  if (sum(Object.values(entity.cp.storage.availableWares)) > 0) {
    const commodityToSell = Object.entries(
      entity.cp.storage.availableWares
    ).find(([, quantity]) => quantity > 0)![0] as Commodity;

    const buyer = sellCommodityWithMostProfit(
      entity,
      commodityToSell,
      1,
      sectorDistance
    );

    if (buyer) {
      const offer = {
        budgets: {
          customer: owner.id,
          trader: buyer.id,
        },
        factionId: owner.id,
        initiator: entity.id,
        items: [
          {
            commodity: commodityToSell,
            price: buyer.cp.trade.offers[commodityToSell].price,
            quantity: Math.min(
              buyer.cp.trade.offers[commodityToSell].quantity,
              entity.cp.storage.availableWares[commodityToSell]
            ),
            type: "sell" as "sell",
          },
        ],
      };
      const actions = arrangeTrade(
        entity,
        { ...offer, tradeId: tradingSystem.createId(entity.id, buyer.id) },
        buyer
      );

      if (actions) {
        entity.cp.orders.value.push({
          origin: "OrderPlanningSystem:auto",
          type: "trade",
          actions,
        });
        makingTrade = true;
      } else {
        dumpCargo(entity, true);
      }
    }
  } else {
    const trade = getTradeWithMostProfit(
      entity.sim.getOrThrow<Sector>(
        (entity.cp.autoOrder.default as TradeOrder).sectorId!
      ),
      sectorDistance,
      (f) =>
        !Object.entries(owner.cp.relations.values)
          .filter(([, value]) => value < relationThresholds.trade)
          .map(([id]) => Number(id))
          .includes(f.cp.owner.id) &&
        (owner.tags.has("player") ? f.tags.has("discovered") : true)
    );
    if (trade) {
      makingTrade = resellCommodity(
        entity,
        trade.commodity,
        trade.buyer,
        trade.seller
      );
    }
  }

  if (!makingTrade) {
    idleMovement(entity);
  }
}

function autoTradeForCommander(
  entity: Trading & RequireComponent<"commander">,
  sectorDistance: number
) {
  const commander = entity.sim
    .getOrThrow(entity.cp.commander.id)
    .requireComponents([
      "budget",
      "docks",
      "name",
      "position",
      "journal",
      "storage",
      "trade",
      "owner",
    ]);

  if (getAvailableSpace(entity.cp.storage) !== entity.cp.storage.max) {
    returnToFacility(entity);
    idleMovement(entity);
  } else {
    for (const commodity of getNeededCommodities(commander)) {
      const result = autoBuyMostNeededByCommander(
        entity,
        commodity,
        sectorDistance
      );
      if (result) {
        return;
      }
    }

    for (const commodity of getCommoditiesForSell(commander)) {
      const result = autoSellMostRedundantToCommander(
        entity,
        commodity,
        sectorDistance
      );
      if (result) {
        return;
      }
    }

    idleMovement(entity);
  }
}

function autoMine(
  entity: RequireComponent<
    | "drive"
    | "dockable"
    | "storage"
    | "autoOrder"
    | "orders"
    | "position"
    | "owner"
  >,
  sectorDistance: number
) {
  if (getAvailableSpace(entity.cp.storage) !== entity.cp.storage.max) {
    autoTrade(entity, sectorDistance);
  } else {
    const baseSector = asSector(
      entity.sim.getOrThrow(
        (entity.cp.autoOrder.default as MineOrder).sectorId!
      )
    );
    const currentSector = asSector(
      entity.sim.getOrThrow(entity.cp.position.sector)
    );
    const sectorsInRange = getSectorsInTeleportRange(
      baseSector,
      sectorDistance,
      entity.sim
    );

    const eligibleFields = pipe(
      sectorsInRange,
      filter((sector) =>
        sector.cp.owner && sector.cp.owner.id !== entity.cp.owner.id
          ? !entity.sim.getOrThrow<Faction>(sector.cp.owner.id).cp.ai
              ?.restrictions.mining
          : true
      ),
      flatMap((sector) =>
        entity.sim.index.asteroidFields
          .get()
          .filter((f) => f.cp.position!.sector === sector.id)
      ),
      map(asteroidField),
      toArray
    );
    const field = minBy(eligibleFields, (e) =>
      hecsToCartesian(currentSector.cp.hecsPosition.value, sectorSize)
        .add(entity.cp.position.coord)
        .squaredDistance(
          hecsToCartesian(
            entity.sim.getOrThrow<Sector>(e.cp.position.sector).cp.hecsPosition
              .value,
            sectorSize
          ).add(e.cp.position.coord)
        )
    );

    if (!field) {
      idleMovement(entity);
      return;
    }

    entity.cp.orders.value.push({
      origin: "OrderPlanningSystem:auto",
      type: "mine",
      actions: [
        ...moveToActions(entity, field),
        mineAction({
          targetFieldId: field.id,
          targetRockId: null,
        }),
      ],
    });
  }
}

function autoMineForCommander(
  entity: RequireComponent<
    | "drive"
    | "dockable"
    | "storage"
    | "autoOrder"
    | "orders"
    | "commander"
    | "position"
    | "owner"
  >,
  sectorDistance: number
) {
  const commander = facility(entity.sim.getOrThrow(entity.cp.commander.id));
  if (!commander.cp.compoundProduction) return;

  if (getAvailableSpace(entity.cp.storage) !== entity.cp.storage.max) {
    if (
      Object.keys(entity.cp.storage.availableWares).some(
        (commodity: Commodity) =>
          entity.cp.storage.availableWares[commodity] > 0 &&
          commander.cp.trade.offers[commodity].active &&
          commander.cp.trade.offers[commodity].type === "buy" &&
          commander.cp.trade.offers[commodity].quantity > 0
      )
    ) {
      returnToFacility(entity);
      idleMovement(entity);
    } else {
      autoTrade(entity, sectorDistance);
    }
  } else {
    const needed = getNeededCommodities(
      commander.requireComponents([...tradeComponents, "compoundProduction"])
    );
    const mineable = needed.find((commodity) =>
      (Object.values(mineableCommodities) as string[]).includes(commodity)
    );

    if (mineable) {
      const sectorsInTeleportRange = getSectorsInTeleportRange(
        asSector(entity.sim.getOrThrow(entity.cp.position.sector)),
        sectorDistance,
        entity.sim
      );
      const asteroidFields = entity.sim.index.asteroidFields.get();

      const eligibleFields = pipe(
        sectorsInTeleportRange,
        filter((sector) =>
          sector.cp.owner && sector.cp.owner.id !== entity.cp.owner.id
            ? !entity.sim.getOrThrow<Faction>(sector.cp.owner.id).cp.ai
                ?.restrictions.mining
            : true
        ),
        flatMap((sector) =>
          asteroidFields.filter((f) => f.cp.position!.sector === sector.id)
        ),
        map(asteroidField),
        filter((e) => e.cp.asteroidSpawn.type === mineable),
        toArray
      );
      const field = minBy(eligibleFields, (e) =>
        entity.cp.position.coord.distance(e.cp.position.coord)
      );

      if (!field) {
        idleMovement(entity);
        return;
      }

      entity.cp.orders.value.push({
        origin: "OrderPlanningSystem:auto",
        type: "mine",
        actions: [
          ...moveToActions(entity, field),
          mineAction({
            targetFieldId: field.id,
            targetRockId: null,
          }),
        ],
      });
    } else {
      idleMovement(entity);
    }
  }
}

function escortCommander(
  entity: RequireComponent<"autoOrder" | "orders" | "commander" | "position">
) {
  const commander = entity.sim.getOrThrow(entity.cp.commander.id);

  if (commander.tags.has("facility")) {
    idleMovement(entity);
  } else {
    entity.cp.orders.value = [
      {
        actions: [],
        type: "escort",
        ordersForSector: 0,
        origin: "OrderPlanningSystem:auto",
        targetId: commander.id,
      },
    ];
  }
}

function autoOrder(entity: RequireComponent<"autoOrder" | "orders">) {
  if (entity.cp.orders.value.length !== 0) {
    return;
  }

  if (!entity.hasComponents(["commander"])) {
    switch (entity.cp.autoOrder.default.type) {
      case "trade":
        autoTrade(entity.requireComponents(tradingComponents), 4);
        break;
      case "mine":
        autoMine(entity.requireComponents(tradingComponents), 4);
        break;
      case "patrol":
      case "pillage":
        entity.cp.orders.value = [
          {
            ...entity.cp.autoOrder.default,
            actions: [],
            origin: "OrderPlanningSystem:auto",
            clockwise: Math.random() > 0.5,
          },
        ];
        break;
      default:
        holdPosition();
    }
    return;
  }

  switch (entity.cp.autoOrder.default.type) {
    case "mine":
      autoMineForCommander(
        entity.requireComponents([
          "mining",
          "dockable",
          "drive",
          "position",
          "storage",
          "autoOrder",
          "commander",
          "orders",
          "owner",
        ]),
        commanderRange
      );
      break;
    case "trade":
      autoTradeForCommander(
        entity.requireComponents([
          "drive",
          "dockable",
          "storage",
          "autoOrder",
          "orders",
          "commander",
          "owner",
          "position",
        ]),
        commanderRange
      );
      break;
    case "escort":
      escortCommander(
        entity.requireComponents([
          "commander",
          "autoOrder",
          "orders",
          "position",
        ])
      );
      break;
    default:
      holdPosition();
  }
}

export class OrderPlanningSystem extends System<"exec"> {
  apply = (sim: Sim): void => {
    super.apply(sim);

    sim.hooks.phase.update.subscribe(this.constructor.name, this.exec);
  };

  exec = (): void => {
    if (this.cooldowns.canUse("exec")) {
      this.cooldowns.use("exec", 3);
      for (const entity of this.sim.index.autoOrderable.getIt()) {
        autoOrder(entity);
      }
    }
  };
}

export const orderPlanningSystem = new OrderPlanningSystem();
