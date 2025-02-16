import { random } from "mathjs";
import { fromPolar } from "@core/utils/misc";
import type { Vec2 } from "ogl";
import type { Sector } from "../archetypes/sector";
import { sectorSize } from "../archetypes/sector";
import { hecsToCartesian } from "../components/hecsPosition";
import { linkTeleportModules } from "../components/teleport";
import type { Sim } from "../sim";
import { createTeleporter } from "./facilities";

export function createLink(sim: Sim, sectors: Sector[], position?: Vec2[]) {
  const positionA = hecsToCartesian(
    sectors[0].cp.hecsPosition.value,
    sectorSize / 10
  );
  const positionB = hecsToCartesian(
    sectors[1].cp.hecsPosition.value,
    sectorSize / 10
  );

  const diff = positionB.clone().sub(positionA);
  const angle = Math.atan2(diff[1], diff[0]);

  const [telA, telB] = sectors.map((sector, sectorIndex) => {
    let linkPosition: Vec2;
    if (!position?.[sectorIndex]) {
      const a =
        (sectorIndex === 0 ? angle : Math.PI + angle) +
        random(-Math.PI / 6, Math.PI / 6);
      const r = random(20, 35);

      linkPosition = fromPolar(a, r);
    } else {
      linkPosition = position[sectorIndex];
    }
    const facility = createTeleporter(
      {
        owner: undefined!,
        position: linkPosition,
        sector,
      },
      sim
    );
    facility.addTag("discovered").addTag("gateway");

    const teleporter = sim
      .getOrThrow(facility.cp.modules.ids[0])
      .requireComponents(["teleport"]);

    facility.removeTag("selection");
    return teleporter;
  });

  linkTeleportModules(telA, telB);

  return [telA, telB];
}
