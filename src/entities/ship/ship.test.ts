import { matrix } from "mathjs";
import { Ship, tradeOrder } from ".";
import { commodities } from "../../economy/commodity";
import { Facility } from "../../economy/factility";
import { Faction } from "../../economy/faction";
import { shipClasses } from "../../world/ships";

describe("Ship", () => {
  it("is able to go to target position", () => {
    const ship = new Ship(shipClasses.shipA);
    ship.position = matrix([1, 0]);

    const reached = ship.moveTo(1, matrix([1, 0.3]));

    expect(reached).toBe(true);
  });

  it("is not able to go to target position if travel is too short", () => {
    const ship = new Ship(shipClasses.shipA);
    ship.position = matrix([1, 0]);

    const reached = ship.moveTo(1, matrix([1, 10]));

    expect(reached).toBe(false);
  });

  it("is able to make move order", () => {
    const ship = new Ship(shipClasses.shipA);
    ship.position = matrix([1, 0]);

    ship.moveOrder(1, {
      type: "move",
      position: matrix([1, 0.5]),
    });

    expect(ship.position.get([0])).toBe(1);
    expect(ship.position.get([1])).toBe(0.3);
  });

  it("is able to sell", () => {
    const facility = new Facility();
    facility.storage.max = 100;
    facility.offers.food = { price: 1, quantity: 20, type: "buy" };
    facility.position = matrix([1, 0]);
    facility.budget.changeMoney(20);

    const ship = new Ship(shipClasses.shipA);
    ship.storage.addStorage("food", 10);
    ship.position = matrix([1, 0]);

    const offer = {
      commodity: commodities.food,
      faction: facility.owner,
      price: 1,
      quantity: 10,
      budget: facility.budget,
      allocations: null,
      type: "sell" as "sell",
    };

    const { budget, storage } = facility.allocate(offer);

    const traded = ship.tradeOrder(
      1,
      tradeOrder({
        offer: {
          commodity: "food",
          faction: facility.owner,
          price: 1,
          quantity: 10,
          budget: facility.budget,
          allocations: {
            buyer: { budget: budget.id, storage: storage.id },
            seller: { budget: null, storage: null },
          },
          type: "sell",
        },
        target: facility,
      })
    );

    expect(traded).toBe(true);
    expect(facility.storage.getAvailableWares().food).toBe(10);
    expect(ship.storage.getAvailableWares().food).toBe(0);
  });

  it("is able to buy", () => {
    const facilityFaction = new Faction("facility-faction");
    const targetFacility = new Facility();
    facilityFaction.addFacility(targetFacility);
    targetFacility.storage.max = 100;
    targetFacility.offers.food = { price: 1, quantity: 20, type: "sell" };
    targetFacility.storage.addStorage("food", 20, false);
    targetFacility.position = matrix([1, 0]);

    const shipFaction = new Faction("ship-faction");
    shipFaction.budget.changeMoney(100);
    const ship = new Ship(shipClasses.shipA);
    ship.setOwner(shipFaction);
    ship.position = matrix([1, 0]);

    const offer = {
      commodity: commodities.food,
      faction: targetFacility.owner,
      price: 1,
      quantity: 10,
      budget: shipFaction.budget,
      allocations: null,
      type: "buy" as "buy",
    };

    const buyerBudgetAllocation = shipFaction.budget.allocations.new({
      amount: offer.price * offer.quantity,
    }).id;
    const sellerStorageAllocation = targetFacility.allocate(offer).storage.id;

    const traded = ship.tradeOrder(
      1,
      tradeOrder({
        offer: {
          commodity: "food",
          faction: targetFacility.owner,
          price: 1,
          quantity: 10,
          budget: shipFaction.budget,
          allocations: {
            buyer: { budget: buyerBudgetAllocation, storage: null },
            seller: { budget: null, storage: sellerStorageAllocation },
          },
          type: "buy",
        },
        target: targetFacility,
      })
    );

    expect(traded).toBe(true);
    expect(targetFacility.storage.getAvailableWares().food).toBe(10);
    expect(ship.storage.getAvailableWares().food).toBe(10);
  });

  it("is able to buy from own faction", () => {
    const faction = new Faction("faction");
    const facility = new Facility();
    faction.addFacility(facility);
    facility.storage.max = 100;
    facility.offers.food = { price: 1, quantity: 20, type: "sell" };
    facility.storage.addStorage("food", 20, false);
    facility.position = matrix([1, 0]);

    const ship = new Ship(shipClasses.shipA);
    ship.setOwner(faction);
    ship.position = matrix([1, 0]);

    const offer = {
      allocations: null,
      commodity: commodities.food,
      faction: facility.owner,
      price: 0,
      quantity: 10,
      budget: faction.budget,
      type: "buy" as "buy",
    };

    const traded = ship.tradeOrder(
      1,
      tradeOrder({
        offer: {
          ...offer,
          allocations: {
            buyer: { budget: null, storage: null },
            seller: {
              budget: null,
              storage: facility.allocate(offer).storage.id,
            },
          },
        },
        target: facility,
      })
    );

    expect(traded).toBe(true);
    expect(facility.storage.getAvailableWares().food).toBe(10);
    expect(ship.storage.getAvailableWares().food).toBe(10);
  });
});
