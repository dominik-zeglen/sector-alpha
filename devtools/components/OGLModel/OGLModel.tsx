import React from "react";
import { Renderer, Camera, Transform, GLTFLoader, Orbit } from "ogl";
import models from "@assets/models";

export const OGLModel: React.FC = () => {
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!canvas) return;

    const renderer = new Renderer({
      canvas: canvas!,
      dpr: 2,
    });
    const gl = renderer.gl;

    const camera = new Camera(gl);
    camera.position.x = 5;
    camera.position.y = 5;
    camera.position.z = 5;
    camera.lookAt([0, 0, 0]);

    const control = new Orbit(camera);

    function resize() {
      renderer.setSize(
        canvas!.parentElement!.clientWidth - 5,
        canvas!.parentElement!.clientHeight - 5
      );
      camera.perspective({
        aspect: gl.canvas.width / gl.canvas.height,
      });
    }
    canvas!.addEventListener("resize", resize, false);
    resize();

    const obs = new ResizeObserver(resize);
    obs.observe(canvas!);

    setTimeout(resize, 1000);

    const scene = new Transform();

    GLTFLoader.load(gl, models["ship/lMil"]).then((model) => {
      function update(_t: number) {
        requestAnimationFrame(update);

        control.update();
        model.meshes[0].primitives[0].rotation.y -= 0.01;

        renderer.render({ scene, camera });
      }
      requestAnimationFrame(update);
    });
  }, [canvas]);

  return <canvas ref={setCanvas} />;
};
