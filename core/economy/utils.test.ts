import { toArray } from "@fxts/core";
import { facilityModules } from "../archetypes/facilityModule";
import type { Faction } from "../archetypes/faction";
import { createFaction } from "../archetypes/faction";
import type { Sector } from "../archetypes/sector";
import { createSector } from "../archetypes/sector";
import { Entity } from "../entity";
import { hecsToCartesian } from "../components/hecsPosition";
import { linkTeleportModules } from "../components/teleport";
import { Sim } from "../sim/Sim";
import { regen } from "../systems/pathPlanning";
import { addFacilityModule } from "../utils/entityModules";
import { getSectorsInTeleportRange } from "./utils";

function createTeleporter(sim: Sim, sector: Sector, owner: Faction) {
  const facility = new Entity(sim);
  facility
    .addComponent({
      name: "position",
      angle: 0,
      coord: hecsToCartesian(sector.cp.hecsPosition.value, 1),
      sector: sector.id,
      moved: false,
    })
    .addComponent({ name: "modules", ids: [] })
    .addComponent({
      name: "owner",
      id: owner.id,
    });
  addFacilityModule(
    facility as any,
    facilityModules.teleport.create(
      sim,
      facility.requireComponents(["position", "modules"])
    )
  );

  return facility.requireComponents(["modules"]);
}

describe("getSectorsInTeleportRange", () => {
  let sim: Sim;
  let sectors: Sector[];

  beforeEach(() => {
    sim = new Sim();
    sectors = [
      createSector(sim, { position: [0, 0, 0], name: "s1" }),
      createSector(sim, { position: [1, 0, 0], name: "s2" }),
      createSector(sim, { position: [2, 0, 0], name: "s3" }),
    ];
  });

  it("properly returns connected sectors", () => {
    const f = createFaction("F", sim);
    const t1 = createTeleporter(sim, sectors[0], f);
    const t2 = createTeleporter(sim, sectors[1], f);
    const t3 = createTeleporter(sim, sectors[1], f);
    const t4 = createTeleporter(sim, sectors[2], f);

    linkTeleportModules(
      sim.getOrThrow(t1.cp.modules.ids[0]).requireComponents(["teleport"]),
      sim.getOrThrow(t2.cp.modules.ids[0]).requireComponents(["teleport"])
    );
    linkTeleportModules(
      sim.getOrThrow(t3.cp.modules.ids[0]).requireComponents(["teleport"]),
      sim.getOrThrow(t4.cp.modules.ids[0]).requireComponents(["teleport"])
    );

    regen(sim);

    expect(toArray(getSectorsInTeleportRange(sectors[0], 0, sim))).toHaveLength(
      1
    );
    expect(toArray(getSectorsInTeleportRange(sectors[0], 1, sim))).toHaveLength(
      2
    );
    expect(toArray(getSectorsInTeleportRange(sectors[0], 2, sim))).toHaveLength(
      3
    );
    expect(toArray(getSectorsInTeleportRange(sectors[1], 1, sim))).toHaveLength(
      3
    );
  });
});
