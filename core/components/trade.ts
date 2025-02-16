import { random, randomInt } from "mathjs";
import { commodityPrices } from "@core/economy/utils";
import type { Commodity } from "../economy/commodity";
import { perCommodity } from "../utils/perCommodity";
import type { BaseComponent } from "./component";

export type PriceBelief = [number, number];
export type TradeOfferType = "buy" | "sell";

export interface TransactionItem {
  commodity: Commodity;
  quantity: number;
  price: number;
  type: TradeOfferType;
}

export type TransactionAllocations = Record<
  "trader" | "customer",
  {
    budget: number | null;
    storage: number | null;
  }
>;
export const createTransactionAllocations = (): TransactionAllocations => ({
  trader: { budget: null, storage: null },
  customer: { budget: null, storage: null },
});

export interface TransactionInput {
  items: TransactionItem[];
  /**
   * ID of entity that initiates trade (usually ship)
   */
  initiator: number;
  allocations: TransactionAllocations;
  budgets: Record<"trader" | "customer", number>;
  factionId: number;
  tradeId: string;
}

export interface TradeOffer {
  active: boolean;
  price: number;
  quantity: number;
  type: TradeOfferType;
}

export type TradeOffers = Record<Commodity, TradeOffer>;

export interface Trade extends BaseComponent<"trade"> {
  /**
   * Automatically manages pricing and stock
   */
  auto: Record<"quantity" | "pricing", boolean>;
  pricing: Record<Commodity, PriceBelief>;
  offers: TradeOffers;
  lastPriceAdjust: { time: number; commodities: Record<Commodity, number> };
}

export function createTrade(): Trade {
  const pricing = perCommodity((commodity) => {
    const lower = random(
      commodityPrices[commodity].min,
      commodityPrices[commodity].max
    );
    const upper = lower + random(5, 20);

    return [lower, upper] as PriceBelief;
  });

  return {
    auto: {
      pricing: true,
      quantity: true,
    },
    name: "trade",
    pricing,
    lastPriceAdjust: {
      time: 0,
      commodities: perCommodity(() => 0),
    },
    offers: perCommodity(
      (commodity): TradeOffer => ({
        active: false,
        price: randomInt(...pricing[commodity]),
        quantity: 0,
        type: "sell",
      })
    ),
  };
}
