import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles, usesize } from "@kit/theming/style";
import { action } from "@storybook/addon-actions";
import { MissionsOverlayComponent as MissionsOverlay } from "./MissionsOverlayComponent";
import type { MissionsOverlayComponentProps } from "./MissionsOverlayComponent";
import { PanelComponent } from "../Panel/PanelComponent";

export default {
  title: "Overlays / Missions",
  component: PanelComponent,
  parameters: {
    layout: "fullscreen",
  },
} as Meta<typeof PanelComponent>;

const Template: StoryFn<typeof MissionsOverlay> = (args) => (
  <div id="root">
    <Styles>
      <div style={{ padding: usesize(4) }}>
        <MissionsOverlay {...args} />
      </div>
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  missions: [
    {
      accepted: 0,
      title: "Patrol Request for Combatting Illegal Activities",
      description:
        "Local Police requests your fleet's assistance in providing patrols to address reports of illegal activities in GJ 229 II, including drug trafficking and vandalism. Your fleet will be rewarded with 122000 UTT and a letter of appreciation from the mayor's office for your team's efforts in combatting crime and safeguarding the community.",
      rewards: [
        { type: "money", amount: 122000 },
        { type: "relation", amount: 1.5, factionId: 377 },
      ],
      references: [
        { id: 16, name: "GJ 229 II" },
        { id: 123, name: "PIR Roach" },
      ],
      elapsed: 0,
      sector: 16,
      time: 1800,
      type: "patrol",
      faction: 377,
      cancellable: true,
    },
    {
      accepted: 0,
      title: "Patrol Request for High-Profile Event Security",
      description:
        "Local Police requests your fleet's assistance in providing additional patrols for heightened security during a high-profile event in Therr with VIPs attending. Your fleet will be rewarded with a premium compensation package of 101000 UTT, including a VIP invitation to the event's closing ceremony and a public acknowledgement of your team's vital role in ensuring a successful and secure event.",
      rewards: [
        { type: "money", amount: 101000 },
        { type: "relation", amount: 1.5, factionId: 385 },
      ],
      references: [{ id: 15, name: "Therr" }],
      elapsed: 0,
      sector: 15,
      time: 1800,
      type: "patrol",
      faction: 385,
      cancellable: false,
    },
    {
      accepted: 0,
      title: "Patrol Request for Crime Surge",
      description:
        "Local Police urgently requests your fleet's assistance in patrolling Discordis c due to a surge in crime. Your fleet will be rewarded with 92000 UTT upon successful completion of the patrols.",
      rewards: [
        { type: "money", amount: 92000 },
        { type: "relation", amount: 1.5, factionId: 337 },
      ],
      references: [{ id: 11, name: "Discordis c" }],
      elapsed: 0,
      sector: 11,
      time: 5400,
      type: "patrol",
      faction: 337,
      cancellable: true,
    },
  ],
  onMissionCancel: action("onMissionCancel"),
  onReferenceClick: action("onReferenceClick"),
} as MissionsOverlayComponentProps;

export const NoMissions = Template.bind({});
NoMissions.args = {
  missions: [],
  onMissionCancel: action("onMissionCancel"),
  onReferenceClick: action("onReferenceClick"),
} as MissionsOverlayComponentProps;
