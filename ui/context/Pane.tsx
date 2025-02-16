import { storageHook } from "@core/hooks";
import type { GameSettings } from "@ui/hooks/useGameSettings";
import { Pane } from "tweakpane";

export const pane = new Pane();
pane.hidden = !process.env.STORYBOOK;

storageHook.subscribe("Pane", (key) => {
  if (key === "gameSettings") {
    const settings = JSON.parse(
      localStorage.getItem("gameSettings")!
    ) as GameSettings;

    if (settings.dev) {
      pane.hidden = false;
    } else {
      pane.hidden = true;
    }
  }
});
