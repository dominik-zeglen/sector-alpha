import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { PureEntity } from "@core/entity";
import { Styles } from "@kit/theming/style";
import { action } from "@storybook/addon-actions";
import { FleetOverlayComponent as FleetOverlay } from "./FleetOverlayComponent";
import type { FleetOverlayComponentProps } from "./FleetOverlayComponent";
import { PanelComponent } from "../Panel/PanelComponent";

export default {
  title: "Overlays / Fleet",
  component: PanelComponent,
  parameters: {
    layout: "fullscreen",
  },
} as Meta<typeof PanelComponent>;

const Template: StoryFn<typeof FleetOverlay> = (args) => (
  <div id="root">
    <Styles>
      <div style={{ padding: "usesize(4)" }}>
        <FleetOverlay {...args} />
      </div>
    </Styles>
  </div>
);

export const Default = Template.bind({});
const fleets = Array(3)
  .fill(0)
  .map((_, i) => {
    const commander = new PureEntity();
    commander.cp.name = { value: `Commander ${i + 1}`, name: "name" };
    commander.cp.autoOrder = {
      name: "autoOrder",
      default: {
        type: "hold",
      },
    };
    commander.cp.render = {
      color: 0x00ff00,
      texture: "lMil",
      model: "ship/lMil",
      defaultScale: 1,
      interactive: true,
      layer: "ship",
      name: "render",
      static: false,
      hidden: 0,
    };

    return {
      commander,
      subordinates: Array(4 - i)
        .fill(0)
        .map((_, j) => {
          if (j === 2) {
            // eslint-disable-next-line no-shadow
            const commander = new PureEntity();
            commander.cp.name = {
              value: `Commander ${i + 1}.${j + 1}`,
              name: "name",
            };
            commander.cp.autoOrder = {
              name: "autoOrder",
              default: {
                targetId: 0,
                type: "escort",
              },
            };

            return {
              commander,
              subordinates: Array(4 - i)
                .fill(0)
                .map((_, k) => {
                  const subordinate = new PureEntity();
                  subordinate.cp.name = {
                    value: `Subordinate ${i + 1}.${j + 1}.${k + 1}`,
                    name: "name",
                  };
                  subordinate.cp.autoOrder = {
                    name: "autoOrder",
                    default: {
                      targetId: 0,
                      type: "escort",
                    },
                  };
                  subordinate.cp.render = {
                    color: 0x00ff00,
                    texture: "sCiv",
                    model: "ship/sCiv",
                    defaultScale: 1,
                    interactive: true,
                    layer: "ship",
                    name: "render",
                    static: false,
                    hidden: 0,
                  };

                  return subordinate;
                }),
            };
          }

          const subordinate = new PureEntity();
          subordinate.cp.name = {
            value: `Subordinate ${i + 1}.${j + 1}`,
            name: "name",
          };
          subordinate.cp.autoOrder = {
            name: "autoOrder",
            default: {
              targetId: 0,
              type: "escort",
            },
          };

          return subordinate;
        }),
    };
  });
const unassigned = Array(5)
  .fill(0)
  .map((_, i) => {
    const ship = new PureEntity();
    ship.cp.name = { value: `Unassigned ${i + 1}`, name: "name" };
    ship.cp.autoOrder = {
      name: "autoOrder",
      default: {
        type: "trade",
      },
    };
    ship.cp.render = {
      color: 0x00ff00,
      texture: "lMil",
      model: "ship/lMil",
      defaultScale: 1,
      interactive: true,
      layer: "ship",
      name: "render",
      static: false,
      hidden: 0,
    };

    return ship;
  });
Default.args = {
  fleets,
  unassigned,
  selected: [0],
  onSelect: action("onSelect"),
  onContextMenu: action("onContextMenu"),
  onFocus: action("onFocus"),
} as FleetOverlayComponentProps;
