import type { FolderApi } from "tweakpane";
import { Camera as BaseCamera } from "ogl";
import { pane } from "@ui/context/Pane";
import type { Engine } from "./engine";

export class Camera extends BaseCamera {
  name = "Camera";
  engine: Engine;

  private paneFolder: FolderApi;

  constructor(engine: Engine) {
    super(engine.gl);
    this.engine = engine;

    this.initPane();
  }

  private initPane() {
    if (pane.children.find((child) => (child as FolderApi).title === "Camera"))
      return;

    this.paneFolder = pane.addFolder({
      title: "Camera",
    });
    const p = this.paneFolder.addBinding(this, "position");
    const r = this.paneFolder.addBinding(this, "rotation");
    this.paneFolder
      .addButton({
        title: "refresh",
      })
      .on("click", () => {
        p.refresh();
        r.refresh();
      });
  }

  disablePane() {
    this.paneFolder?.dispose();
  }
}
