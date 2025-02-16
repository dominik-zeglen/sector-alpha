import React from "react";
import type { StoryFn, Meta } from "@storybook/react";
import { Styles } from "@kit/theming/style";
import { OglCanvas } from "ogl-engine/OglCanvas";
import { Skybox } from "@ogl-engine/materials/skybox/skybox";
import arrowDownFat from "@assets/ui/icons/arrow_down_fat.svg";
import { Orbit, Sphere, Vec3 } from "ogl";
import { BaseMesh } from "@ogl-engine/engine/BaseMesh";
import { Light } from "@ogl-engine/engine/Light";
import { ColorMaterial } from "@ogl-engine/materials/color/color";
import { Engine3D } from "@ogl-engine/engine/engine3d";
import { Scene } from "@ogl-engine/engine/Scene";

/**
 * There is an additional specular reflection on the top. It comes form skybox
 * lighting.
 */
const LightingStory: React.FC<{
  postProcessing: boolean;
  intensity: number;
  radius: number;
}> = ({ postProcessing, intensity, radius }) => {
  const engine = React.useMemo(() => new Engine3D(), []);
  const controlRef = React.useRef<Orbit>();
  const skyboxRef = React.useRef<Skybox>();
  const boxRef = React.useRef<BaseMesh<ColorMaterial>>();
  const lightsRef = React.useRef<Light[]>([]);
  const radiusRef = React.useRef(radius);

  React.useEffect(() => {
    engine.hooks.onInit.subscribe("LightingStory", async () => {
      engine.setScene(new Scene(engine));
      engine.camera.position.set(2);
      controlRef.current = new Orbit(engine.camera);
      skyboxRef.current = new Skybox(engine, "example");
      lightsRef.current.push(
        new Light(intensity, false),
        new Light(intensity, false)
      );
      lightsRef.current[0].setColor("#ff0000");
      lightsRef.current[1].setColor("#0000ff");
      lightsRef.current.forEach((light) => {
        engine.scene.addChild(light);
        engine.addLight(light);
      });

      const img = new Image();
      img.onload = () => {
        boxRef.current = new BaseMesh(engine, {
          geometry: new Sphere(engine.gl),
        });
        boxRef.current.applyMaterial(new ColorMaterial(engine, new Vec3(255)));
        boxRef.current.material.uniforms.fEmissive.value = 0.0;
        engine.scene.addChild(boxRef.current);
      };
      img.src = arrowDownFat;
    });

    engine.hooks.onUpdate.subscribe("LightingStory", () => {
      for (let i = 0; i < lightsRef.current.length; i++) {
        lightsRef.current[i].position.x =
          Math.sin(engine.uniforms.uTime.value + i * Math.PI) *
          radiusRef.current;
        lightsRef.current[i].position.y = radiusRef.current;
        lightsRef.current[i].position.z =
          Math.cos(engine.uniforms.uTime.value) * radiusRef.current;
      }
      controlRef.current!.update();
    });
  }, [engine]);

  React.useEffect(() => {
    engine.postProcessing = postProcessing;
  }, [engine, postProcessing]);

  React.useEffect(() => {
    for (let i = 0; i < lightsRef.current.length; i++) {
      lightsRef.current[i].setIntensity(intensity);
    }
  }, [intensity]);

  React.useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  return <OglCanvas engine={engine} />;
};

export default {
  title: "OGL / Lighting",
  parameters: {
    layout: "fullscreen",
  },
  args: {
    postProcessing: false,
    intensity: 5,
    radius: 3,
  },
  argTypes: {
    postProcessing: {
      control: {
        type: "boolean",
      },
    },
  },
} as Meta;

const Template: StoryFn = ({ postProcessing, intensity, radius }) => (
  <div id="root">
    <Styles>
      <LightingStory
        postProcessing={postProcessing}
        intensity={intensity}
        radius={radius}
      />
    </Styles>
  </div>
);

export const Default = Template.bind({});
Default.args = {};
