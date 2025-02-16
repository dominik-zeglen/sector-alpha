import models from "@assets/models";
import type {
  Geometry,
  GLTFMaterial,
  ImageRepresentation,
  OGLRenderingContext,
  Vec3,
} from "ogl";
import { Euler, GLTFLoader } from "ogl";
import { chunk, fromEntries, keys, map, pipe, values } from "@fxts/core";
import { skyboxes } from "@assets/textures/skybox";
import smoke from "@assets/textures/particle/smoke.png";
import fire from "@assets/textures/particle/fire.png";
import spaceMonoTexture from "@assets/fonts/SpaceMono/SpaceMono-Regular.png";
import { getParticleType } from "./particles";
import { TextureEngine } from "./engine/engine2d";
import smokeShader from "./procedural/smoke.frag.glsl";

export type ModelName = keyof typeof models;

const textures = {
  "particle/smoke": smoke,
  "particle/fire": fire,
  "font/spaceMono": spaceMonoTexture,
};
export type TextureName = keyof typeof textures | `prop/smoke_${number}`;

export interface ParticleGeneratorInput {
  name: string;
  position: Vec3;
  rotation: Euler;
  scale: Vec3;
}

class AssetLoader {
  ready: boolean = false;
  readyPromise: Promise<void>;
  models: Record<
    string,
    {
      geometry: Geometry;
      material: GLTFMaterial;
      particles?: Array<ParticleGeneratorInput>;
    }
  > = {};
  textures: Partial<Record<TextureName, ImageRepresentation>> = {};

  // eslint-disable-next-line class-methods-use-this
  async preload(onAssetLoad: (_progress: number) => void) {
    await this.generateTextures();

    const resources = pipe(
      {
        ...models,
        ...Object.values(skyboxes).flatMap(Object.values),
        ...textures,
      },
      values,
      map((path) => [path, false] as [string, boolean]),
      fromEntries
    );

    const updateProgress = () =>
      onAssetLoad(
        Object.values(resources).filter(Boolean).length /
          Object.values(resources).length
      );

    const queue = pipe(
      resources,
      keys,
      map((path) => async () => {
        await fetch(path);
        console.log(`Loaded ${path}`);
        resources[path] = true;
      }),
      chunk(3)
    );

    for (const jobChunk of queue) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(jobChunk.map((job) => job()));
      updateProgress();
    }
  }

  async generateTextures() {
    const textureEngine = new TextureEngine();
    textureEngine.size = 1024 * 4;
    textureEngine.init(new OffscreenCanvas(512, 512));
    textureEngine.setShader(smokeShader);
    textureEngine.update();
    for (let i = 0; i < 16; i++) {
      const name = `prop/smoke_${i + 1}`;

      textureEngine.seed();
      textureEngine.render();
      const img = new Image();
      // eslint-disable-next-line no-await-in-loop
      await textureEngine.image(img);
      this.addTexture(name as TextureName, img);
      console.log(`Generated ${name}`);
    }
  }

  load(gl: OGLRenderingContext) {
    this.readyPromise = Promise.all(
      Object.entries(models).map(([modelName, modelPath]) =>
        this.getGltf(gl, modelName, modelPath)
      )
    ).then(() => {
      this.ready = true;
    });

    return this.readyPromise;
  }

  async getGltf(gl: OGLRenderingContext, modelName: string, modelPath: string) {
    const model = await GLTFLoader.load(gl, modelPath);

    this.models[modelName] = {
      geometry: model.meshes[0].primitives[0].geometry,
      material: model.materials?.[0],
    };

    for (const node of model.nodes) {
      const particleType = getParticleType(node.name!);
      if (particleType) {
        this.models[modelName].particles ??= [];
        this.models[modelName].particles!.push({
          name: node.name!,
          position: node.position.clone().sub(model.nodes[0].position),
          rotation: new Euler().copy(node.rotation),
          scale: node.scale.clone(),
        });
      }
    }

    this.models[modelName].geometry.computeBoundingBox();
    return this.models[modelName];
  }

  model(name: ModelName) {
    return this.models[name];
  }

  addTexture(name: TextureName, image: ImageRepresentation) {
    this.textures[name] = image;
  }

  addTextureByUrl(url: string, image: ImageRepresentation) {
    for (const [textureName, textureUrl] of Object.entries(textures)) {
      if (url === textureUrl) {
        this.textures[textureName] = image;
      }
    }
  }

  getTexture(name: TextureName) {
    if (!this.textures[name]) {
      const image = new Image();
      image.src = textures[name];
      this.textures[name] = image;
    }
    return this.textures[name];
  }
}

export const assetLoader = new AssetLoader();
