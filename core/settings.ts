export const isHeadless =
  !(global.window && global.document) || process.env.NODE_ENV === "test";
export const isDev = process.env.NODE_ENV === "development";

const settings = {
  camera: {
    near: 1e-2,
    far: 5e3,
  },
  bootTime: 3600,
  global: {
    targetFps: 240,
  },
};

export default settings;
