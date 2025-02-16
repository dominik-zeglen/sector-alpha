import type { OGLRenderingContext } from "ogl";
import { Geometry, Text, Texture } from "ogl";
import type { Sector } from "@core/archetypes/sector";
import { hecsToCartesian } from "@core/components/hecsPosition";
import spaceMono from "@assets/fonts/SpaceMono/SpaceMono-Regular.json";
import { MSDFMaterial } from "@ogl-engine/materials/msdf/msdf";
import { assetLoader } from "@ogl-engine/AssetLoader";
import Color from "color";
import type { Faction } from "@core/archetypes/faction";
import { ColorMaterial2D } from "@ogl-engine/materials/color/color";
import { strategicMapStore } from "@ui/state/strategicMap";
import { BaseMesh2D } from "./BaseMesh2D";
import type { Engine2D } from "./engine2d";

class RegularPolygonGeometry extends Geometry {
  constructor(gl: OGLRenderingContext, n = 6) {
    super(gl);

    const position = new Float32Array((n + 1) * 3);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      position.set([Math.cos(angle), 0, Math.sin(angle)], (i + 1) * 3);
    }

    const index = new Uint16Array(n * 3);
    for (let i = 0; i < n; i++) {
      index.set([6, i, i + 1], i * 3);
    }

    this.addAttribute("position", {
      size: 3,
      data: position,
    });
    // this.addAttribute("uv", {
    //     data: position,
    // });
    this.addAttribute("index", {
      data: index,
    });
  }
}

class SectorGeometry extends Geometry {
  constructor(gl: OGLRenderingContext) {
    super(gl);

    const position = new Float32Array(12 * 3);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      position.set([Math.cos(angle), 0, Math.sin(angle)], i * 3);
    }
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 0.98;
      position.set([Math.cos(angle) * r, 0, Math.sin(angle) * r], 18 + i * 3);
    }

    this.addAttribute("position", {
      size: 3,
      data: position,
    });
    this.addAttribute("index", {
      data: new Uint16Array([
        0, 1, 6, 1, 2, 7, 2, 3, 8, 3, 4, 9, 4, 5, 10, 5, 0, 11,

        6, 7, 1, 7, 8, 2, 8, 9, 3, 9, 10, 4, 10, 11, 5, 11, 6, 0,
      ]),
    });
  }
}

export class SectorMesh extends BaseMesh2D<ColorMaterial2D> {
  entity: Sector;

  hovered = false;
  selected = false;

  selectionBackdrop: BaseMesh2D<ColorMaterial2D>;

  constructor(engine: Engine2D, sector: Sector) {
    super(engine, {
      geometry: new SectorGeometry(engine.gl),
    });
    this.applyMaterial(new ColorMaterial2D(engine, "#1f1f1f"));

    this.entity = sector;

    this.name = `Sector:${sector.id}`;
    const hecsPos = hecsToCartesian(sector.cp.hecsPosition.value, 1);

    this.position.set(hecsPos[0], 0, hecsPos[1]);

    this.createNameMesh();
    this.createBackdropMesh();
  }

  createNameMesh() {
    const text = new Text({
      font: spaceMono,
      text: this.entity.cp.name.value,
      width: 40,
      align: "center",
      letterSpacing: 0.05,
      size: 1,
      lineHeight: 1.1,
    });

    const sectorNameMesh = new BaseMesh2D<MSDFMaterial>(this.engine, {
      geometry: new Geometry(this.engine.gl, {
        position: { size: 3, data: text.buffers.position },
        uv: { size: 2, data: text.buffers.uv },
        id: { size: 1, data: text.buffers.id },
        index: { data: text.buffers.index },
      }),
    });
    sectorNameMesh.position.z -= 0.85;
    sectorNameMesh.rotation.set(-Math.PI / 2, 0, 0);
    sectorNameMesh.scale.set(0.08);
    const texture = new Texture(this.engine.gl, {
      image: assetLoader.getTexture("font/spaceMono"),
      generateMipmaps: false,
    });
    sectorNameMesh.applyMaterial(new MSDFMaterial(this.engine, texture));
    sectorNameMesh.setParent(this);
  }

  createBackdropMesh() {
    const backdrop = new BaseMesh2D(this.engine, {
      geometry: new RegularPolygonGeometry(this.engine.gl, 6),
      material: new ColorMaterial2D(this.engine, "#1f1f1f"),
    });
    backdrop.position.y -= 0.005;
    backdrop.scale.set(1);
    backdrop.visible = false;
    backdrop.setParent(this);
    this.selectionBackdrop = backdrop;
  }

  updateColor(): void {
    if (this.hovered) {
      this.setSectorHoverColor();
    } else if (this.selected) {
      this.setSectorSelectedColor();
    } else {
      this.setSectorDefaultColor();
    }
  }

  setSectorHoverColor(): void {
    let color = "#1f1f1f";
    if (this.entity.cp.owner) {
      color = this.entity.sim.getOrThrow<Faction>(this.entity.cp.owner.id).cp
        .color.value;
    }
    this.material.setColor(Color(color).lighten(0.3).hex());
  }

  setSectorSelectedColor(): void {
    let color = "#1f1f1f";
    if (this.entity.cp.owner) {
      color = this.entity.sim.getOrThrow<Faction>(this.entity.cp.owner.id).cp
        .color.value;
    }
    this.material.setColor(Color(color).lighten(0.5).hex());
  }

  setSectorDefaultColor(): void {
    let color = "#1f1f1f";
    if (this.entity.cp.owner) {
      color = this.entity.sim.getOrThrow<Faction>(this.entity.cp.owner.id).cp
        .color.value;
    }
    this.material.setColor(color);
  }

  setHovered(hovered: boolean) {
    this.hovered = hovered;
    this.updateColor();
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.updateColor();
    this.selectionBackdrop.visible = selected;
    if (this.selected) {
      strategicMapStore.selectSector(this.entity);
    }
  }
}
