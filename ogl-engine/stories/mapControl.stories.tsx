import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { OglCanvas } from "ogl-engine/OglCanvas";
import sCiv from "@assets/models/ship/sCiv.glb";
import { AxesHelper, GLTFLoader } from "ogl";
import { MapControl } from "@ogl-engine/MapControl";
import { Engine } from "@ogl-engine/engine/engine";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";

const ModelStory: React.FC = () => {
  const engine = React.useMemo(() => new Engine(), []);
  const controlRef = React.useRef<MapControl>();
  const skyboxRef = React.useRef<Skybox>();

  React.useEffect(() => {
    engine.hooks.onInit.subscribe("MapControlStory", async () => {
      controlRef.current = new MapControl(engine.camera);
      const helper = new AxesHelper(engine.gl, {});
      helper.setParent(engine.scene);
      skyboxRef.current = new Skybox(
        engine.renderer.gl,
        engine.scene,
        "example"
      );

      const gltf = await GLTFLoader.load(engine.gl, sCiv);
      const mesh = BaseMesh.fromGltf(engine, gltf);
      mesh.applyMaterial(new SimplePbrMaterial(engine, gltf.materials[0]));
      engine.scene.addChild(mesh);
    });

    engine.hooks.onUpdate.subscribe("MapControlStory", () => {
      controlRef.current!.update();
    });
  }, [engine]);

  return <OglCanvas engine={engine} />;
};

export default {
  title: "OGL / Map Control",
  parameters: {
    layout: "fullscreen",
  },
} as Meta;

const Template: StoryFn = () => (
  <div id="root">
    <Styles>
      <ModelStory />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
