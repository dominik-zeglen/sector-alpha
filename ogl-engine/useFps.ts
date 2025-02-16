import { actionLoader } from "@core/actionLoader";
import { isDev } from "@core/settings";
import { useCallback, useEffect, useRef, useState } from "react";

export function useFps(register?: boolean) {
  const framesCounterRef = useRef(0);
  const [fps, setFps] = useState(0);
  const [enabled, setEnabled] = useState(isDev);

  useEffect(() => {
    if (register) {
      actionLoader.register(
        {
          category: "drawing",
          description: "Toggle FPS counter",
          slug: "fps",
          fn: () => setEnabled((v) => !v),
          name: "FPS Counter",
          type: "basic",
        },
        "OglCanvas"
      );
    }

    const ticker = setInterval(() => {
      setFps(framesCounterRef.current);
      framesCounterRef.current = 0;
    }, 1000) as unknown as number;

    return () => {
      clearInterval(ticker);
    };
  }, []);

  const tick = useCallback(() => {
    framesCounterRef.current += 1;
  }, []);

  return {
    fps,
    enabled,
    tick,
  };
}
