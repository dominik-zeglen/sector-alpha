import React, { useCallback } from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { GLTFLoader, Orbit } from "ogl";
import models from "@assets/models";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";
import { entityScale } from "@ui/components/TacticalMap/EntityMesh";
import { skyboxes } from "@assets/textures/skybox";
import type { Engine3D } from "@ogl-engine/engine/engine3d";
import { merge } from "lodash";
import type { Story3dArgs } from "./Story3d";
import { Story3d, story3dMeta } from "./Story3d";

interface ModelStoryProps extends Story3dArgs {
  model: string;
  rotationSpeed: number;
}

const ModelStory: React.FC<ModelStoryProps> = ({
  model: modelName,
  skybox,
  rotationSpeed,
  postProcessing,
}) => {
  const engineRef = React.useRef<Engine3D>();
  const meshRef = React.useRef<BaseMesh>();
  const controlRef = React.useRef<Orbit>();
  const rotationSpeedRef = React.useRef(rotationSpeed);
  const load = useCallback((m: keyof typeof models, engine: Engine3D) => {
    GLTFLoader.load(engine.gl, m).then((model) => {
      meshRef.current = BaseMesh.fromGltf(engine, model, {
        material: model.materials?.[0]
          ? new SimplePbrMaterial(engine, model.materials[0])
          : undefined,
      });
      meshRef.current.setParent(engine.scene);
      meshRef.current.scale.set(entityScale);
    });
  }, []);

  const onInit = useCallback(async (engine: Engine3D) => {
    engineRef.current = engine;
    engine.camera.position.set(0.1);

    controlRef.current = new Orbit(engine.camera, {
      inertia: 0.8,
    });

    load(models[modelName], engine);
  }, []);

  const onUpdate = useCallback(() => {
    if (meshRef.current) {
      meshRef.current!.rotation.y += rotationSpeedRef.current * 0.001;
    }
    controlRef.current!.update();
  }, []);

  React.useEffect(() => {
    if (engineRef.current?.initialized) {
      meshRef.current?.parent?.removeChild(meshRef.current);
      load(models[modelName], engineRef.current);
    }
  }, [modelName]);

  React.useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

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
  title: "OGL / Model",
  ...merge(
    {
      args: {
        model: Object.keys(models)[0],
        skybox: Object.keys(skyboxes)[0],
        rotationSpeed: 1,
      },
      argTypes: {
        model: {
          options: Object.keys(models).map((m) => m.replace(/\//, "-")),
          control: { type: "select" },
        },
        skybox: {
          options: Object.keys(skyboxes),
          control: { type: "select" },
        },
      },
    },
    story3dMeta
  ),
} as Meta;

const Template: StoryFn<ModelStoryProps> = ({
  model,
  skybox,
  rotationSpeed,
  postProcessing,
}) => (
  <div id="root">
    <Styles>
      <ModelStory
        model={model.replace(/-/, "/")}
        skybox={skybox}
        rotationSpeed={rotationSpeed}
        postProcessing={postProcessing}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  model: "ship-lMil",
} as ModelStoryProps;
