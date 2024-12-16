import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import type { SmokeParticleGenerator } from "@ogl-engine/particles/smoke";
import { merge } from "lodash";
import { assetLoader } from "@ogl-engine/AssetLoader";
import type { FireParticleGenerator } from "@ogl-engine/particles/fire";
import type { Engine } from "@ogl-engine/engine/engine";
import type { ParticleGeneratorType } from "@ogl-engine/particles";
import { particleGenerator } from "@ogl-engine/particles";
import type { Story3dArgs } from "./Story3d";
import { Story3d, story3dMeta } from "./Story3d";

assetLoader.loadTextures(() => {});

const ParticleGeneratorStory: React.FC<
  Story3dArgs & {
    particles: number;
    type: ParticleGeneratorType;
  }
> = ({ postProcessing, skybox, particles, type }) => {
  const engineRef = React.useRef<Engine>();
  const generatorRef = React.useRef<
    SmokeParticleGenerator | FireParticleGenerator
  >();
  const onInit = React.useCallback((engine) => {
    engineRef.current = engine;
    engine.camera.position.set(1, 1, 1);
    const constructor = particleGenerator[type];
    generatorRef.current = new constructor(engine);
    generatorRef.current.spawnRate = particles;
    engine.scene.addChild(generatorRef.current);
  }, []);
  const onUpdate = React.useCallback((_, delta) => {
    if (generatorRef.current) {
      generatorRef.current.update(delta);
    }
  }, []);

  React.useEffect(() => {
    if (generatorRef.current) generatorRef.current.spawnRate = particles;
  }, [particles]);

  React.useEffect(() => {
    if (!engineRef.current) return;

    generatorRef.current?.destroy();

    const constructor = particleGenerator[type];
    generatorRef.current = new constructor(engineRef.current);
    generatorRef.current.spawnRate = particles;
  }, [type]);

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
  title: "OGL / Particles",
  ...merge(
    {
      args: {
        particles: 10,
        type: "smoke",
      },
      argTypes: {
        type: {
          options: Object.keys(particleGenerator),
          control: {
            type: "select",
          },
        },
      },
    },
    story3dMeta
  ),
} as Meta;

const Template: StoryFn = ({ postProcessing, particles, skybox, type }) => (
  <div id="root">
    <Styles>
      <ParticleGeneratorStory
        postProcessing={postProcessing}
        particles={particles}
        skybox={skybox}
        type={type}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
