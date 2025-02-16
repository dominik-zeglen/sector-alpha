import { distance, matrix } from "mathjs";
import { createFaction } from "../archetypes/faction";
import { createWaypoint } from "../archetypes/waypoint";
import type { Sector } from "../archetypes/sector";
import { createSector } from "../archetypes/sector";
import type { Ship } from "../archetypes/ship";
import { createShip } from "../archetypes/ship";
import { Sim } from "../sim";
import { shipClasses } from "../world/ships";
import { NavigatingSystem } from "./navigating";
import { MovingSystem } from "./moving";
import { OrderExecutingSystem } from "./orderExecuting/orderExecuting";
import { setTarget } from "../utils/moving";
import type { RequireComponent } from "../tsHelpers";
import { Entity } from "../entity";

describe("Floating entity", () => {
  let sim: Sim;
  let movingSystem: MovingSystem;
  let entity: RequireComponent<"position" | "movable">;
  let sector: Sector;

  beforeEach(() => {
    movingSystem = new MovingSystem();

    sim = new Sim({
      systems: [movingSystem],
    });
    sector = createSector(sim, {
      position: matrix([0, 0, 0]),
      name: "",
      slug: "",
    });
    entity = new Entity(sim)
      .addComponent({
        name: "position",
        angle: 0,
        coord: [0, 0],
        sector: sector.id,
        moved: false,
      })
      .addComponent({
        name: "movable",
        velocity: 0,
        rotary: 0,
        acceleration: 0,
      })
      .requireComponents(["movable", "position"]);
  });

  it("moves freely in space", () => {
    entity.cp.movable.velocity = 1;
    movingSystem.exec(1);
    expect(distance(entity.cp.position.coord, [1, 0])).toBeLessThan(0.01);
  });

  it("follows its rotation", () => {
    entity.cp.movable.velocity = 1;
    entity.cp.position.angle = Math.PI / 2;
    movingSystem.exec(1);
    expect(distance(entity.cp.position.coord, [0, 1])).toBeLessThan(0.01);
  });
});

describe("Ship", () => {
  let sim: Sim;
  let navigatingSystem: NavigatingSystem;
  let movingSystem: MovingSystem;
  let orderExecutingSystem: OrderExecutingSystem;
  let ship: Ship;
  let sector: Sector;

  beforeEach(() => {
    movingSystem = new MovingSystem();
    navigatingSystem = new NavigatingSystem();
    orderExecutingSystem = new OrderExecutingSystem();

    sim = new Sim({
      systems: [movingSystem, navigatingSystem, orderExecutingSystem],
    });
    sector = createSector(sim, {
      position: matrix([0, 0, 0]),
      name: "",
      slug: "",
    });
    ship = createShip(sim, {
      ...shipClasses.find((s) => s.name === "Courier A")!,
      position: [1, 0],
      owner: createFaction("F", sim),
      sector,
    });
    ship.cp.drive.maneuver = 1;
  });

  it("is able to go to target position", () => {
    ship.cp.position.coord = [0, 0];
    setTarget(
      ship,
      createWaypoint(sim, {
        sector: sector.id,
        value: [1, 0],
        owner: 0,
      }).id
    );

    for (let index = 0; index < 6; index++) {
      navigatingSystem.exec(1);
      movingSystem.exec(1);
    }

    expect(ship.cp.drive.targetReached).toBe(true);
  });

  it("is not able to go to target position if travel is too short", () => {
    setTarget(
      ship,
      createWaypoint(sim, {
        sector: sector.id,
        value: [1, 10],
        owner: 0,
      }).id
    );

    navigatingSystem.exec(1);
    movingSystem.exec(1);

    expect(ship.cp.drive.targetReached).toBe(false);
  });

  it("is able to make move order", () => {
    const m = createWaypoint(sim, {
      sector: sector.id,
      value: [1, 1],
      owner: 0,
    });
    ship.cp.orders.value.push({
      origin: "manual",
      type: "move",
      actions: [
        {
          type: "move",
          targetId: m.id,
        },
      ],
    });

    orderExecutingSystem.exec();
    for (let index = 0; index < 12; index++) {
      navigatingSystem.exec(1);
      movingSystem.exec(1);
    }

    expect(distance(ship.cp.position.coord, [1, 1])).toBeLessThan(0.01);
    expect(ship.cp.drive.targetReached).toBe(true);
  });
});
