declare module "*.svg" {
  const content: "content(svg)";
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.wav" {
  const content: string;
  export default content;
}

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.glb" {
  const content: string;
  export default content;
}

declare module "*.glsl" {
  const content: string;
  export default content;
}
