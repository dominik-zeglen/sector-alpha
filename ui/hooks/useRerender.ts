import { useEffect, useState } from "react";

export function useRerender(time: number) {
  const [, setRender] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setRender((v) => !v), time);
    return () => clearInterval(interval);
  }, [time]);
}
