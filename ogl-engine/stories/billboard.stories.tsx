import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { OglCanvas } from "ogl-engine/OglCanvas";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import { Billboard } from "@ogl-engine/utils/billboard";
import arrowDownFat from "@assets/ui/icons/arrow_down_fat.svg";
import { Orbit, Texture } from "ogl";
import { TintedTextureMaterial } from "@ogl-engine/materials/tintedTexture/tintedTexture";
import { Engine3D } from "@ogl-engine/engine/engine3d";

const BillboardStory: React.FC<{
  postProcessing: boolean;
  scaling: boolean;
}> = ({ postProcessing, scaling }) => {
  const engine = React.useMemo(() => new Engine3D(), []);
  const controlRef = React.useRef<Orbit>();
  const skyboxRef = React.useRef<Skybox>();
  const billboardRef = React.useRef<Billboard<TintedTextureMaterial>>();

  React.useEffect(() => {
    engine.hooks.onInit.subscribe("BillboardStory", async () => {
      controlRef.current = new Orbit(engine.camera);
      skyboxRef.current = new Skybox(engine, "example");

      const img = new Image();
      img.onload = () => {
        billboardRef.current = new Billboard(engine);
        billboardRef.current.applyMaterial(
          new TintedTextureMaterial(
            engine,
            new Texture(engine.gl, { image: img }),
            "#fc0"
          )
        );
        billboardRef.current.material.uniforms.fEmissive.value = 0.3;
        engine.scene.addChild(billboardRef.current);
      };
      img.src = arrowDownFat;
    });

    engine.hooks.onUpdate.subscribe("BillboardStory", () => {
      controlRef.current!.update();
    });
  }, [engine]);

  React.useEffect(() => {
    engine.postProcessing = postProcessing;
  }, [engine, postProcessing]);

  React.useEffect(() => {
    if (billboardRef.current) {
      billboardRef.current.setScaling(scaling);
    }
  }, [scaling]);

  return <OglCanvas engine={engine} />;
};

export default {
  title: "OGL / Billboard Drawing",
  parameters: {
    layout: "fullscreen",
  },
  args: {
    postProcessing: false,
    scaling: false,
  },
  argTypes: {
    postProcessing: {
      control: {
        type: "boolean",
      },
    },
    scaling: {
      control: {
        type: "boolean",
      },
    },
  },
} as Meta;

const Template: StoryFn = ({ postProcessing, scaling }) => (
  <div id="root">
    <Styles>
      <BillboardStory postProcessing={postProcessing} scaling={scaling} />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
