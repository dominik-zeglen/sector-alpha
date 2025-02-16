import React from "react";

import styles from "./styles.scss";
import { useFps } from "./useFps";
import type { Engine } from "./engine/engine";

export interface OglCanvasProps {
  engine: Engine;
  fpsCounter?: boolean;
}

export const OglCanvas: React.FC<OglCanvasProps> = React.memo(
  ({ engine, fpsCounter = true }) => {
    const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
    const resizeObserver = React.useRef<ResizeObserver>();
    const frameIdRef = React.useRef(0);
    const { fps, tick, enabled: fpsCounterEnabled } = useFps(fpsCounter);
    const [errorCount, setErrorCount] = React.useState(0);

    React.useEffect(() => {
      const cleanup = () => {
        resizeObserver.current?.disconnect();
        cancelAnimationFrame(frameIdRef.current);
      };
      if (!canvas) return cleanup;

      engine.hooks.onUpdate.subscribe("OglCanvas", () => {
        tick();
        frameIdRef.current = requestAnimationFrame(engine.update.bind(engine));
      });
      engine.hooks.onError.subscribe("OglCanvas", () => {
        setErrorCount((count) => count + 1);
      });

      engine.init(canvas);

      resizeObserver.current = new ResizeObserver(engine.resize);
      resizeObserver.current.observe(canvas!.parentElement!);

      frameIdRef.current = requestAnimationFrame(engine.update.bind(engine));

      setTimeout(engine.resize.bind(engine), 200);

      return cleanup;
    }, [canvas, engine]);

    React.useEffect(() => {
      if (errorCount > 10) {
        console.error("Too many errors, stopping rendering");
        cancelAnimationFrame(frameIdRef.current);
      }
    }, [errorCount]);

    return (
      <>
        <canvas
          ref={setCanvas}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          style={{ pointerEvents: "all" }}
        />
        {fpsCounterEnabled && fpsCounter && (
          <div className={styles.fps}>{fps}</div>
        )}
      </>
    );
  }
);
