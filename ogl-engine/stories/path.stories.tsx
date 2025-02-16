import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { OglCanvas } from "ogl-engine/OglCanvas";
import { Vec3 } from "ogl";
import { MapControl } from "@ogl-engine/MapControl";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import type { PathColor } from "@ogl-engine/utils/path";
import { Path } from "@ogl-engine/utils/path";
import { Engine3D } from "@ogl-engine/engine/engine3d";
import { Entity } from "@core/entity";
import { Scene } from "@ogl-engine/engine/Scene";

const waypoints: [Vec3, PathColor][] = [
  [new Vec3(0, 0, 0), "default"],
  [new Vec3(1, 0, 0), "warning"],
  [new Vec3(1, 0, 1), "default"],
  [new Vec3(0, 0, 1), "default"],
];

const PathStory: React.FC = () => {
  const engine = React.useMemo(() => new Engine3D(), []);
  const controlRef = React.useRef<MapControl>();
  const skyboxRef = React.useRef<Skybox>();
  const pathRef = React.useRef<Path>();

  React.useEffect(() => {
    engine.hooks.onInit.subscribe("MapControlStory", async () => {
      engine.setScene(new Scene(engine));
      controlRef.current = new MapControl(engine.camera, engine.canvas);
      skyboxRef.current = new Skybox(engine, "example");
      skyboxRef.current.setParent(engine.scene);

      pathRef.current = new Path(engine, new Entity());
      pathRef.current.update(waypoints);
      engine.scene.addChild(pathRef.current);
    });

    engine.hooks.onUpdate.subscribe("MapControlStory", () => {
      pathRef.current?.update(waypoints);
      controlRef.current!.update();
    });
  }, [engine]);

  return <OglCanvas engine={engine} />;
};

export default {
  title: "OGL / Path Drawing",
  parameters: {
    layout: "fullscreen",
  },
} as Meta;

const Template: StoryFn = () => (
  <div id="root">
    <Styles>
      <PathStory />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
