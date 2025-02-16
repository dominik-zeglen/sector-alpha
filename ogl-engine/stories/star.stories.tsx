import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { Orbit } from "ogl";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { merge } from "lodash";
import { Star } from "@ogl-engine/engine/Star";
import type { Story3dArgs } from "./Story3d";
import { Story3d, story3dMeta } from "./Story3d";

interface StarStoryProps extends Story3dArgs {}

const StarStory: React.FC<StarStoryProps> = ({ postProcessing, skybox }) => {
  const engineRef = React.useRef<Engine3D>();
  const starRef = React.useRef<Star>();
  const controlRef = React.useRef<Orbit>();

  const onInit = React.useCallback(async (engine: Engine3D) => {
    engineRef.current = engine;
    starRef.current = new Star(engine, "#f2a0ae");
    starRef.current.setParent(engine.scene);
    starRef.current.createPaneFolder();
    controlRef.current = new Orbit(engine.camera, {
      inertia: 0.8,
    });
  }, []);

  const onUpdate = React.useCallback(() => {
    controlRef.current!.update();
  }, []);

  return (
    <Story3d
      postProcessing={postProcessing}
      onEngineInit={onInit}
      onEngineUpdate={onUpdate}
      skybox={skybox}
    />
  );
};

export default {
  title: "OGL / Star",
  ...merge({}, story3dMeta),
} as Meta;

const Template: StoryFn<StarStoryProps> = ({ postProcessing, skybox }) => (
  <div id="root">
    <Styles>
      <StarStory postProcessing={postProcessing} skybox={skybox} />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {} as StarStoryProps;
