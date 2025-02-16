import { reaction, isObservable } from "mobx";
import { useEffect, useState } from "react";

export function useMobx<T extends object, TResult extends Array<any>>(
  store: T,
  selector: (_store: T) => TResult
): [TResult, T] {
  const [data, setData] = useState<TResult>(selector(store));

  useEffect(() => {
    if (!isObservable(store)) {
      // eslint-disable-next-line no-console
      console.warn(
        "The store is not observable. Make sure it is properly marked as observable."
      );
    }

    const disposer = reaction(() => selector(store), setData, {
      equals: (a, b) => {
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      },
      fireImmediately: true,
    });

    return disposer;
  }, []);

  return [data, store];
}
