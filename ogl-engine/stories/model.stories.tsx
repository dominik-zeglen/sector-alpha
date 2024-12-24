import React, { useCallback } from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { OglCanvas } from "ogl-engine/OglCanvas";
import { GLTFLoader, Orbit, Vec3 } from "ogl";
import models from "@assets/models";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { SimplePbrMaterial } from "@ogl-engine/materials/simplePbr/simplePbr";
import { entityScale } from "@ui/components/TacticalMap/EntityMesh";
import { skyboxes } from "@assets/textures/skybox";
import { Light } from "@ogl-engine/engine/Light";
import Color from "color";
import { Engine3D } from "@ogl-engine/engine/engine3d";

interface ModelStoryProps {
  model: string;
  skybox: keyof typeof skyboxes;
  rotationSpeed: number;
  intensity: number;
}

function createLights(intensity: number): Light[] {
  const lights = [
    new Light(new Vec3(...Color("#dafff1").array()), intensity, false),
    new Light(new Vec3(...Color("#f9fae6").array()), intensity, false),
  ];
  lights[0].position.set(10, 0, 0);
  lights[1].position.set(0, 10, 0);

  return lights;
}

const ModelStory: React.FC<ModelStoryProps> = ({
  model: modelName,
  skybox: skyboxName,
  rotationSpeed,
  intensity,
}) => {
  const engine = React.useMemo(() => new Engine3D(), []);
  const meshRef = React.useRef<BaseMesh>();
  const skyboxRef = React.useRef<Skybox>();
  const controlRef = React.useRef<Orbit>();
  const rotationSpeedRef = React.useRef(rotationSpeed);
  const lights = React.useRef<Light[]>(createLights(intensity));
  const load = useCallback((m: keyof typeof models) => {
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

  React.useEffect(() => {
    engine.hooks.onInit.subscribe("ModelStory", async () => {
      engine.camera.position.set(0.1);
      lights.current.forEach((l) => engine.scene.addChild(l));
      lights.current.forEach(engine.addLight);

      controlRef.current = new Orbit(engine.camera, {
        inertia: 0.8,
      });

      skyboxRef.current = new Skybox(engine, skyboxName);
      skyboxRef.current.setParent(engine.scene);

      load(models[modelName]);
    });

    engine.hooks.onUpdate.subscribe("ModelStory", () => {
      if (meshRef.current) {
        meshRef.current!.rotation.y += rotationSpeedRef.current * 0.001;
      }
      controlRef.current!.update();
    });
  }, []);

  React.useEffect(() => {
    if (engine.initialized) {
      meshRef.current?.parent?.removeChild(meshRef.current);
      load(models[modelName]);
    }
  }, [modelName]);

  React.useEffect(() => {
    if (engine.initialized) {
      skyboxRef.current?.destroy();
      skyboxRef.current = new Skybox(engine, skyboxName);
      skyboxRef.current.setParent(engine.scene);
    }
  }, [skyboxName]);

  React.useEffect(() => {
    rotationSpeedRef.current = rotationSpeed;
  }, [rotationSpeed]);

  React.useEffect(() => {
    for (const light of lights.current) {
      light.setIntensity(intensity);
    }
  }, [intensity]);

  return <OglCanvas engine={engine} />;
};

export default {
  title: "OGL / Model",
  parameters: {
    layout: "fullscreen",
  },
  args: {
    model: Object.keys(models)[0],
    skybox: Object.keys(skyboxes)[0],
    rotationSpeed: 1,
    intensity: 6,
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
} as Meta;

const Template: StoryFn<ModelStoryProps> = ({
  model,
  skybox,
  rotationSpeed,
  intensity,
}) => (
  <div id="root">
    <Styles>
      <ModelStory
        model={model.replace(/-/, "/")}
        skybox={skybox}
        rotationSpeed={rotationSpeed}
        intensity={intensity}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {
  model: "ship-lMil",
} as ModelStoryProps;
