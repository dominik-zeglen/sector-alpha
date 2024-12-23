import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { merge } from "lodash";
import type { Engine } from "@ogl-engine/engine/engine";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { assetLoader } from "@ogl-engine/AssetLoader";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";
import {
  EntityIndicator,
  entityScale,
} from "@ui/components/TacticalMap/EntityMesh";
import models from "@assets/models";
import Color from "color";
import { Story3d, story3dMeta } from "./Story3d";
import type { Story3dArgs } from "./Story3d";

const EntityIndicatorStory: React.FC<
  Story3dArgs & {
    color: string;
  }
> = ({ postProcessing, skybox, color }) => {
  const engineRef = React.useRef<Engine>();
  const onInit = React.useCallback(async (engine) => {
    engineRef.current = engine;
    engine.camera.position.set(1, 1, 1);

    const model = await assetLoader.getGltf(
      engine.gl,
      "ship/mCiv",
      models["ship/mCiv"]
    );
    const ship = new BaseMesh(engine, {
      geometry: model.geometry,
    });
    ship.applyMaterial(new SimplePbrMaterial(engine, model.material));
    ship.scale.set(entityScale);
    ship.setParent(engine.scene);

    const indicator = new EntityIndicator(engine);
    indicator.material.setColor(Color(color).rgbNumber());
    indicator.setParent(ship);
  }, []);

  React.useEffect(() => {
    if (!engineRef.current) return;

    const indicator = engineRef.current.scene.children.find(
      (c) => c instanceof EntityIndicator
    );
    indicator?.material.setColor(Color(color).rgbNumber());
  }, [color]);

  return (
    <Story3d
      postProcessing={postProcessing}
      onEngineInit={onInit}
      onEngineUpdate={() => {}}
      skybox={skybox}
    />
  );
};

export default {
  title: "OGL / Entity Indicator",
  ...merge(
    {
      args: {
        color: "#ff0000",
      },
      argTypes: {
        color: {
          control: {
            type: "color",
          },
        },
      },
    },
    story3dMeta
  ),
} as Meta;

const Template: StoryFn = ({ postProcessing, skybox, color }) => (
  <div id="root">
    <Styles>
      <EntityIndicatorStory
        postProcessing={postProcessing}
        skybox={skybox}
        color={color}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
