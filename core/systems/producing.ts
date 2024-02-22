import { gameDay, gameMonth } from "@core/utils/misc";
import { every } from "@fxts/core";
import type { Production } from "../components/production";
import type { CommodityStorage } from "../components/storage";
import {
  addStorage,
  hasSufficientStorage,
  removeStorage,
} from "../components/storage";
import type { Commodity } from "../economy/commodity";
import { commodities } from "../economy/commodity";
import type { Sim } from "../sim";
import type { RequireComponent } from "../tsHelpers";
import { findInAncestors } from "../utils/findInAncestors";
import { limitMax } from "../utils/limit";
import { perCommodity } from "../utils/perCommodity";
import { System } from "./system";

function produce(production: Production, storage: CommodityStorage) {
  const multiplier = gameDay / gameMonth;

  perCommodity((commodity) => {
    if (production.pac[commodity].consumes > 0) {
      removeStorage(
        storage,
        commodity,
        Math.floor(production.pac[commodity].consumes * multiplier)
      );
    }
  });
  perCommodity((commodity) => {
    if (production.pac[commodity].produces > 0) {
      addStorage(
        storage,
        commodity,
        Math.floor(
          limitMax(
            storage.quota[commodity] -
              production.pac[commodity].produces * multiplier,
            production.pac[commodity].produces * multiplier
          )
        ),
        false
      );
    }
  });
}

export function isAbleToProduce(
  facilityModule: RequireComponent<"production">,
  storage: CommodityStorage
  // eslint-disable-next-line no-unused-vars
): boolean {
  if (!facilityModule.cooldowns.canUse("production")) return false;

  const multiplier = gameDay / gameMonth;
  return every(
    (commodity) =>
      hasSufficientStorage(
        storage,
        commodity,
        facilityModule.cp.production.pac[commodity].consumes * multiplier
      ) &&
      (facilityModule.cp.production.pac[commodity].produces * multiplier
        ? storage.availableWares[commodity] < storage.quota[commodity]
        : true),
    Object.values(commodities) as Commodity[]
  );
}

export class ProducingSystem extends System<"exec"> {
  apply = (sim: Sim): void => {
    super.apply(sim);

    this.sim.hooks.removeEntity.tap("ProducingSystem", (entity) => {
      if (entity.cp.modules) {
        entity.cp.modules.ids.forEach((id) =>
          this.sim.getOrThrow(id).unregister()
        );
      }
    });
    sim.hooks.phase.update.tap(this.constructor.name, this.exec);
  };

  exec = (): void => {
    if (!this.cooldowns.canUse("exec")) return;

    for (const entity of this.sim.queries.standaloneProduction.getIt()) {
      if (!isAbleToProduce(entity, entity.cp.storage)) {
        continue;
      }

      entity.cooldowns.use("production", gameDay);

      produce(entity.cp.production, entity.cp.storage);
    }

    for (const facilityModule of this.sim.queries.productionByModules.getIt()) {
      const facility = findInAncestors(facilityModule, "storage");
      const storage = facility.cp.storage;
      if (!isAbleToProduce(facilityModule, storage)) {
        continue;
      }

      facilityModule.cooldowns.use("production", gameDay);

      produce(facilityModule.cp.production, storage);
    }

    this.cooldowns.use("exec", gameDay);
  };
}
