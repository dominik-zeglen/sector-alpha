import { facility } from "@core/archetypes/facility";
import { facilityModules } from "@core/archetypes/facilityModule";
import type { Ship } from "@core/archetypes/ship";
import { createBudget } from "@core/components/budget";
import type { CoreComponents } from "@core/components/component";
import { createDocks } from "@core/components/dockable";
import { createRender } from "@core/components/render";
import { createCommodityStorage } from "@core/components/storage";
import { createTrade } from "@core/components/trade";
import { addFacilityModule } from "@core/utils/entityModules";
import { transport3D } from "../transport3d";

export function deployFacilityAction(entity: Ship): boolean {
  transport3D.hooks.deployFacility.notify(entity);

  const render = createRender({
    ...entity.cp.render,
    defaultScale: 1,
    texture: "fFactory",
    layer: "facility",
  });

  (
    [
      "autoOrder",
      "commander",
      "damage",
      "deployable",
      "dockable",
      "docks",
      "drive",
      "mining",
      "name",
      "render",
      "storage",
      "orders",
    ] as Array<keyof CoreComponents>
  ).reduce((ship, component) => ship.removeComponent(component), entity);

  entity
    .removeTag("ship")
    .removeTag("role:building")
    .addComponent(createBudget())
    .addComponent(createDocks({ large: 1, medium: 3, small: 3 }))
    .addComponent({
      name: "modules",
      ids: [],
    })
    .addComponent({
      name: "name",
      value: "Facility",
    })
    .addComponent(createCommodityStorage())
    .addComponent(createTrade())
    .addComponent({
      name: "crew",
      workers: {
        current: 0,
        max: 0,
      },
      mood: 50,
    })
    .addComponent({ name: "facilityModuleQueue", building: null, queue: [] })
    .addComponent({ name: "journal", entries: [] })
    .addComponent(render)
    .addTag("facility");

  const facilityEnt = facility(entity);

  addFacilityModule(
    facilityEnt,
    facilityModules.basicHabitat.create(entity.sim, facilityEnt)
  );
  addFacilityModule(
    facilityEnt,
    facilityModules.basicStorage.create(entity.sim, facilityEnt)
  );

  entity.cp.position.angle = 0;

  return true;
}
