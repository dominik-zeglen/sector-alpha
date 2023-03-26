import type { Ship } from "@core/archetypes/ship";
import { ship as asShip, shipComponents } from "@core/archetypes/ship";
import { relationThresholds } from "@core/components/relations";
import type { Entity } from "@core/entity";
import type { Sim } from "@core/sim";
import { Cooldowns } from "@core/utils/cooldowns";
import { getSubordinates } from "@core/utils/misc";
import { filter, first, map, pipe, sortBy } from "@fxts/core";
import { distance } from "mathjs";
import { requestShip } from "./shipPlanning";
import { System } from "./system";

const fightersInFleet = 9;

export class TauHarassingSystem extends System {
  cooldowns: Cooldowns<"exec">;

  constructor(sim: Sim) {
    super(sim);
    this.cooldowns = new Cooldowns("exec");
  }

  getFleet = (): Ship | null => {
    const faction = this.sim.queries.ai
      .get()
      .find((ai) => ai.cp.name.slug === "TAU")!;
    const shipyard = this.sim.queries.shipyards
      .get()
      .find((s) => s.cp.owner.id === faction.id);

    if (!shipyard) return null;

    const fullQueue = [
      shipyard.cp.shipyard.building,
      ...shipyard.cp.shipyard.queue,
    ];
    let commander = this.sim.queries.orderable
      .get()
      .find(
        (entity) =>
          entity.cp.owner.id === faction.id &&
          entity.hasTags(["role:military", "ai:attack-force"]) &&
          entity.cp.dockable?.size === "medium"
      )
      ?.requireComponents(shipComponents);

    if (!commander) {
      const spareFrigates: Entity[] = this.sim.queries.orderable
        .get()
        .filter(
          (ship) =>
            ship.cp.owner?.id === faction.id &&
            !ship.cp.commander &&
            ship.cp.dockable?.size === "medium" &&
            ship.tags.has("role:military") &&
            !ship.tags.has("ai:attack-force") &&
            ship.cp.orders.value.length === 0
        );

      const frigatesInShipyards = fullQueue.filter(
        (queued) =>
          queued?.blueprint.role === "military" &&
          queued?.blueprint.size === "medium"
      );

      if (spareFrigates.length > 0) {
        commander = spareFrigates
          .pop()!
          .requireComponents(this.sim.queries.orderable.requiredComponents);
        commander.addTag("ai:attack-force");
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

    if (!commander) {
      return null;
    }

    const spareFighters = this.sim.queries.orderable
      .get()
      .filter(
        (ship) =>
          ship.cp.owner?.id === faction.id &&
          !ship.cp.commander &&
          ship.cp.dockable?.size === "small" &&
          ship.tags.has("role:military") &&
          !ship.tags.has("ai:attack-force") &&
          ship.cp.orders.value.length === 0
      );

    const fightersInShipyards = fullQueue.filter(
      (queued) =>
        queued?.blueprint.role === "military" &&
        queued?.blueprint.size === "small"
    );

    const fighters = getSubordinates(commander);

    for (let i = 0; i < fightersInFleet - fighters.length; i++) {
      if (spareFighters.length > 0) {
        const ship = asShip(spareFighters.pop()!);
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
        ship.addComponent({ name: "commander", id: commander.id });
        fighters.push(ship);
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

    if (
      fighters.length === fightersInFleet &&
      fighters.every(
        (f) =>
          f.cp.position.sector === commander!.cp.position.sector &&
          distance(f.cp.position.coord, commander!.cp.position.coord) < 4
      )
    ) {
      return commander;
    }

    return null;
  };

  exec = (delta: number): void => {
    this.cooldowns.update(delta);
    if (!this.cooldowns.canUse("exec")) return;
    this.cooldowns.use("exec", 30);

    const faction = this.sim.queries.ai
      .get()
      .find((ai) => ai.cp.name.slug === "TAU")!;

    const commander = this.getFleet();
    if (!commander || commander.cp.orders.value.length !== 0) return;

    const enemyFactions = Object.entries(faction.cp.relations.values)
      .filter(([_id, value]) => value < relationThresholds.attack)
      .map(([id]) => Number(id));
    const invadedSector = pipe(
      this.sim.queries.sectors.get(),
      filter((s) =>
        s.cp.owner?.id ? enemyFactions.includes(s.cp.owner.id) : false
      ),
      map((s) => ({
        sector: s,
        distance:
          this.sim.paths[commander.cp.position.sector.toString()][
            s.id.toString()
          ].distance,
      })),
      sortBy((s) => s.distance),
      map(({ sector }) => sector),
      first
    )!;

    commander.cp.orders.value.push({
      type: "patrol",
      actions: [],
      origin: "auto",
      sectorId: invadedSector.id,
    });
    console.log(
      `${faction.cp.name.slug} are launching an attack on ${invadedSector.cp.name.value}`
    );
  };
}
