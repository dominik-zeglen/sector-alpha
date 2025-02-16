import { random, sum } from "mathjs";
import map from "lodash/map";
import {
  pipe,
  map as fxtsMap,
  sum as fxtsSum,
  filter,
  flatMap,
  identity,
  values,
} from "@fxts/core";
import type { RequireComponent } from "@core/tsHelpers";
import type { Collectible } from "@core/archetypes/collectible";
import { createCollectible } from "@core/archetypes/collectible";
import { fromPolar } from "@core/utils/misc";
import {
  InsufficientStorage,
  InsufficientStorageSpace,
  NegativeQuantity,
  NonIntegerQuantity,
} from "../errors";
import { perCommodity } from "../utils/perCommodity";
import type {
  Allocation,
  AllocationMeta,
  Allocations,
} from "../components/utils/allocations";
import {
  newAllocation,
  releaseAllocation,
} from "../components/utils/allocations";
import type { Commodity } from "../economy/commodity";
import { commoditiesArray } from "../economy/commodity";
import type { BaseComponent } from "./component";

export function isIncomingAllocation(amount: number): boolean {
  return amount > 0;
}

export function isOutgoingAllocation(amount: number): boolean {
  return !isIncomingAllocation(amount);
}

function sumAllocations(
  allocations: StorageAllocation[],
  amountFilter?: (_amount: number) => boolean,
  sumFilter?: (_sum: number) => boolean
): number {
  return (
    pipe(
      allocations,
      flatMap(
        (a) =>
          pipe(
            a.amount,
            values,
            amountFilter ? filter(amountFilter) : identity,
            fxtsSum
          ) ?? 0
      ),
      sumFilter ? filter(sumFilter) : identity,
      fxtsSum
    ) ?? 0
  );
}

export interface StorageAllocation extends Allocation {
  /**
   * Negative amount means outgoing transfer, positive means incoming
   */
  amount: Record<Commodity, number>;
}

export interface CommodityStorage
  extends Allocations<StorageAllocation>,
    BaseComponent<"storage"> {
  stored: Record<Commodity, number>;
  availableWares: Record<Commodity, number>;

  max: number;
  quota: Record<Commodity, number>;
}

export function hasSufficientStorage(
  storage: CommodityStorage,
  commodity: Commodity,
  quantity: number
): boolean {
  return storage.availableWares[commodity] >= quantity;
}

export function updateAvailableWares(storage: CommodityStorage) {
  for (const commodity of commoditiesArray) {
    storage.availableWares[commodity] = Math.max(
      0,
      storage.stored[commodity] +
        (pipe(
          storage.allocations,
          fxtsMap((a) => a.amount[commodity]),
          filter(isOutgoingAllocation),
          fxtsSum
        ) || 0)
    );
  }
}

export function getAvailableSpace(storage: CommodityStorage) {
  return (
    storage.max -
    sum(map(storage.stored)) -
    sumAllocations(storage.allocations, undefined, isIncomingAllocation)
  );
}

export function hasSufficientStorageSpace(
  storage: CommodityStorage,
  quantity: number
) {
  if (quantity < 0) {
    throw new NegativeQuantity(quantity);
  }

  return getAvailableSpace(storage) >= quantity;
}

export function validateStorageAllocation(
  storage: CommodityStorage,
  allocation: StorageAllocation
) {
  const hasCommoditiesOnStock = Object.entries(allocation.amount)
    .map(
      ([commodity, quantity]) =>
        storage.availableWares[commodity] +
          (pipe(
            storage.allocations,
            fxtsMap((a) => a.amount[commodity]),
            filter(isIncomingAllocation),
            fxtsSum
          ) || 0) >=
        -quantity
    )
    .every(Boolean);
  const hasSpaceForAllocation =
    sum(Object.values(allocation.amount)) <= getAvailableSpace(storage);
  return hasCommoditiesOnStock && hasSpaceForAllocation;
}

export function getTransferableQuantity(
  storage: CommodityStorage,
  quantity: number,
  exact = true
): number {
  if (quantity < 0) {
    throw new NegativeQuantity(quantity);
  }
  if (!Number.isInteger(quantity)) {
    throw new NonIntegerQuantity(quantity);
  }

  const availableSpace = getAvailableSpace(storage);

  if (availableSpace >= quantity) {
    return quantity;
  }
  if (exact) {
    throw new InsufficientStorageSpace(quantity, availableSpace);
  }

  return availableSpace;
}

export function addStorage(
  storage: CommodityStorage,
  commodity: Commodity,
  quantity: number,
  exact = true
): number {
  if (quantity === 0) {
    return 0;
  }

  const transferred = getTransferableQuantity(storage, quantity, exact);
  storage.stored[commodity] += transferred;
  updateAvailableWares(storage);

  return quantity - transferred;
}

export function removeStorage(
  storage: CommodityStorage,
  commodity: Commodity,
  quantity: number
) {
  if (quantity < 0) {
    throw new NegativeQuantity(quantity);
  }
  if (!Number.isInteger(quantity)) {
    throw new NonIntegerQuantity(quantity);
  }
  if (quantity === 0) {
    return;
  }
  if (!hasSufficientStorage(storage, commodity, quantity)) {
    throw new InsufficientStorage(quantity, storage.availableWares[commodity]);
  }

  storage.stored[commodity] -= quantity;
  updateAvailableWares(storage);
}

export function newStorageAllocation(
  storage: CommodityStorage,
  input: Omit<StorageAllocation, "id" | "meta">,
  meta: AllocationMeta = {}
) {
  const allocation = newAllocation(storage, { ...input, meta }, (a) =>
    validateStorageAllocation(storage, a)
  );
  updateAvailableWares(storage);

  return allocation;
}

export function releaseStorageAllocation(
  storage: CommodityStorage,
  id: number,
  reason: string
): StorageAllocation {
  const allocation = releaseAllocation(storage, id, reason);
  updateAvailableWares(storage);

  return allocation;
}

export function createCommodityStorage(max?: number): CommodityStorage {
  const storage: CommodityStorage = {
    allocationIdCounter: 1,
    allocations: [],
    allocationReleaseLog: [],
    max: max ?? 0,
    availableWares: perCommodity(() => 0),
    stored: perCommodity(() => 0),
    quota: perCommodity(() => 0),
    name: "storage",
  };
  updateAvailableWares(storage);

  return storage;
}

export interface SimpleCommodityStorage
  extends BaseComponent<"simpleCommodityStorage"> {
  commodity: Commodity;
  stored: number;
}

export const collectibleSize = 50;
export function dumpCargo(
  entity: RequireComponent<"storage">,
  update?: boolean
): Collectible[] {
  const collectibles: Collectible[] = [];
  Object.entries(
    update ? entity.cp.storage.availableWares : entity.cp.storage.stored
  ).forEach(([commodity, quantity]) => {
    for (
      let i = update ? quantity : Math.floor(quantity * random(0.2, 0.6));
      i > 0;
      i -= collectibleSize
    ) {
      const q = Math.min(i, collectibleSize);

      collectibles.push(
        createCollectible(entity.sim, {
          position: {
            coord: fromPolar(random(0, Math.PI * 2), random(0, 0.25)).add(
              entity.cp.position!.coord
            ),
            sector: entity.cp.position!.sector,
          },
          storage: {
            commodity: commodity as Commodity,
            stored: q,
          },
        })
      );

      if (update) {
        removeStorage(entity.cp.storage, commodity as Commodity, q);
      }
    }
  });

  return collectibles;
}
