import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles, usesize } from "@kit/theming/style";
import { Sim } from "@core/sim";
import { createSector } from "@core/archetypes/sector";
import { RecoilRoot } from "recoil";
import { simAtom } from "@ui/atoms";
import { gameStore } from "@ui/state/game";
import { PanelComponent } from "../Panel/PanelComponent";
import { MapOverlay } from "./MapOverlay";

const sim = new Sim();
createSector(sim, {
  name: "Test Sector I",
  position: [0, 0, 0],
  slug: "test-1",
});
createSector(sim, {
  name: "Test Sector II",
  position: [1, 0, 0],
  slug: "test-2",
});
sim.init();

export default {
  title: "Overlays / Strategic",
  component: PanelComponent,
  parameters: {
    layout: "fullscreen",
  },
} as Meta<typeof PanelComponent>;

gameStore.setOverlay("map");

const Template: StoryFn<typeof MapOverlay> = (args) => (
  <RecoilRoot
    initializeState={(snap) => {
      snap.set(simAtom, sim);
    }}
  >
    <div id="root">
      <Styles>
        <div style={{ padding: usesize(4), height: "100%" }}>
          <MapOverlay {...args} />
        </div>
      </Styles>
    </div>
  </RecoilRoot>
);

export const Default = Template.bind({});
Default.args = {};
