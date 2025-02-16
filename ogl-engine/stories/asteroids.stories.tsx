import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { merge } from "lodash";
import { Asteroids } from "@ogl-engine/engine/Asteroids";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { assetLoader } from "@ogl-engine/AssetLoader";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";
import { entityScale } from "@ui/components/TacticalMap/EntityMesh";
import models from "@assets/models";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { Story3d, story3dMeta } from "./Story3d";
import type { Story3dArgs } from "./Story3d";

const AsteroidsStory: React.FC<
  Story3dArgs & {
    size: number;
    density: number;
    color: string;
  }
> = ({ postProcessing, skybox, size, density, color }) => {
  const engineRef = React.useRef<Engine3D>();
  const onInit = React.useCallback(async (engine) => {
    await assetLoader.generateTextures();
    engineRef.current = engine;
    engine.camera.position.set(1, 1, 1);

    const asteroids = new Asteroids(engine, size, density, color);
    asteroids.setParent(engine.scene);

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
  }, []);

  React.useEffect(() => {
    if (!engineRef.current) return;

    const asteroids = engineRef.current.scene.children.find(
      (c) => c instanceof Asteroids
    );
    asteroids?.setParent(null);

    new Asteroids(engineRef.current, size, density, color).setParent(
      engineRef.current.scene
    );
  }, [size, density, color]);

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
  title: "OGL / Asteroids",
  ...merge(
    {
      args: {
        size: 10,
        density: 1,
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

const Template: StoryFn = ({
  postProcessing,
  skybox,
  size,
  density,
  color,
}) => (
  <div id="root">
    <Styles>
      <AsteroidsStory
        postProcessing={postProcessing}
        skybox={skybox}
        size={size}
        density={density}
        color={color}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
