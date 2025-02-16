import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { createTrade } from "@core/components/trade";
import { commodityPrices } from "@core/economy/utils";
import { FacilityTradeManagerComponent } from "./FacilityTradeManagerComponent";

export default {
  title: "Dialogs / Facility Trade Manager",
  component: FacilityTradeManagerComponent,
  parameters: {
    layout: "fullscreen",
  },
} as Meta<typeof FacilityTradeManagerComponent>;

const Template: StoryFn<typeof FacilityTradeManagerComponent> = (args) => (
  <div id="root">
    <Styles>
      <FacilityTradeManagerComponent {...args} />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  open: true,
  auto: false,
  offers: {
    ...createTrade().offers,
    drones: {
      active: true,
      price: commodityPrices.drones.avg,
    },
    food: {
      active: true,
      price: commodityPrices.food.avg,
    },
    electronics: {
      active: true,
      price: commodityPrices.electronics.avg,
    },
    fuel: {
      active: true,
      price: commodityPrices.fuel.avg,
    },
  },
};
