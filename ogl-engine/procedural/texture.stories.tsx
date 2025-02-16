import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { TextureEngine } from "@ogl-engine/engine/engine2d";
import smoke from "./smoke.frag.glsl";

const TextureStory: React.FC = () => {
  const image = React.useRef<HTMLImageElement>(null);
  const engine = React.useMemo(() => new TextureEngine(), []);

  React.useEffect(() => {
    engine.init(new OffscreenCanvas(512, 512));

    engine.size = 1024 * 4;
    engine.setShader(smoke);

    engine.update();
    engine.render();
    engine.image(image.current!);
  }, []);

  // eslint-disable-next-line jsx-a11y/alt-text
  return <img ref={image} />;
};

export default {
  title: "OGL / Procedural / Texture",
  parameters: {
    layout: "fullscreen",
  },
} as Meta;

const Template: StoryFn = () => (
  <div id="root">
    <Styles>
      <TextureStory />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
