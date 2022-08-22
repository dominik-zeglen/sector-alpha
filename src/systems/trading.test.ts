import { matrix } from "mathjs";
import { Facility } from "../archetypes/facility";
import { createFaction, factionComponents } from "../archetypes/faction";
import { createSector } from "../archetypes/sector";
import { changeBudgetMoney } from "../components/budget";
import { addStorage } from "../components/storage";
import { commodities } from "../economy/commodity";
import { Sim } from "../sim";
import { createFarm } from "../world/facilities";
import { settleStorageQuota } from "./storageQuotaPlanning";
import { TradingSystem } from "./trading";

describe("Trading system", () => {
  let sim: Sim;
  let system: TradingSystem;
  let facility: Facility;

  beforeEach(() => {
    sim = new Sim();
    system = new TradingSystem(sim);
    facility = createFarm(
      {
        owner: createFaction("F", sim)
          .addComponent({
            name: "ai",
            priceModifier: 0.01,
            stockpiling: 1,
            type: "territorial",
          })
          .requireComponents(factionComponents),
        position: matrix([0, 0]),
        sector: createSector(sim, { name: "", position: matrix([0, 0, 0]) }),
      },
      sim
    );
    facility.cp.storage.quota.food = 1000;
  });

  it("creates offers", () => {
    system.exec(10);

    expect(Object.keys(facility.cp.trade.offers)).toHaveLength(
      Object.keys(commodities).length
    );
    expect(facility.cp.trade.offers.food.quantity).toBeDefined();
  });

  it("creates sell offers is surplus is positive", () => {
    system.exec(10);

    expect(facility.cp.trade.offers.food.quantity).toBeGreaterThan(0);
  });

  it("creates buy offers is surplus is negative", () => {
    changeBudgetMoney(facility.cp.budget, 1000);
    system.exec(10);

    expect(facility.cp.trade.offers.water.type).toBe("buy");
  });

  it("properly sets offer quantity if has no commodity", () => {
    settleStorageQuota(facility);
    system.exec(10);

    expect(facility.cp.storage.quota.water).toBe(1191);
    expect(facility.cp.trade.offers.water.quantity).toBe(1191);
  });

  it("properly sets offer quantity if already has some commodity", () => {
    addStorage(facility.cp.storage, "water", 10, false);
    settleStorageQuota(facility);
    system.exec(10);

    expect(facility.cp.storage.quota.water).toBe(1191);
    expect(facility.cp.trade.offers.water.quantity).toBe(1181);
  });
});
