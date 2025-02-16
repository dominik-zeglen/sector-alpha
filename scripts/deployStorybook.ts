import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream, readdirSync } from "fs";
import { chunk } from "@fxts/core";
import progress from "cli-progress";
import { lookup } from "mime-types";

const s3Client = new S3Client({
  region: "eu-west-1",
});
const bucketName = "storybook-sectoralpha";

async function cleanBucket() {
  const data = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
    })
  );

  if (data.Contents) {
    return s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: data.Contents.map((item) => ({ Key: item.Key })),
        },
      })
    );
  }

  return Promise.resolve();
}

const walk = (dir: string): string[] => {
  const files = readdirSync(dir, { withFileTypes: true });
  return files
    .map((file) =>
      file.isDirectory() ? walk(`${dir}/${file.name}`) : `${dir}/${file.name}`
    )
    .flat();
};

async function upload() {
  const chunks = [...chunk(5, walk("storybook-static"))];
  const bar = new progress.SingleBar({}, progress.Presets.rect);
  bar.start(chunks.length, 0);
  let i = 0;
  for (const uploadChunk of chunks) {
    i++;
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      uploadChunk.map((file) =>
        s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: file.replace("storybook-static/", ""),
            Body: createReadStream(file),
            ContentType: lookup(file) || undefined,
          })
        )
      )
    );
    bar.update(i);
  }
  bar.stop();
}

async function main() {
  await cleanBucket();

  console.log("Bucket cleaned 🧹");

  await upload();

  console.log(`http://${bucketName}.s3-website.eu-west-1.amazonaws.com/`);
  console.log("Storybook uploaded 👍");
}

main();
