import { assetLoader } from "@ogl-engine/AssetLoader";
import type { Engine } from "@ogl-engine/engine/engine";
import type { ImageRepresentation, TextureOptions } from "ogl";
import { Texture } from "ogl";

export async function loadTextureImage(
  url: string,
  imageArg?: HTMLImageElement
): Promise<ImageRepresentation> {
  const image = imageArg ?? new Image();
  image.src = url;

  return new Promise((resolve) => {
    image.onload = () => {
      resolve(image);
      assetLoader.addTextureByUrl(url, image);
    };
  });
}

export async function loadTexture(
  engine: Engine,
  url: string,
  opts: Partial<TextureOptions> = {}
): Promise<Texture> {
  const image = await loadTextureImage(url);
  return new Texture(engine.gl, { image, ...opts });
}
