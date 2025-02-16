export type ObserverFn<T> = (_value: T) => void;

export class Observable<T> {
  /**
   * If true, the observer will add a error boundary to the observer calls
   */
  boundary: boolean;
  name: string;
  observers: Map<ObserverFn<T>, string> = new Map();
  value: T;

  onError: Array<(_err: Error) => void> = [];

  constructor(name: string, boundary = true) {
    this.name = name;
    this.boundary = boundary;
  }

  subscribe = (origin: string, fn: ObserverFn<T>) => {
    this.observers.set(fn, origin);
    if (this.value) fn(this.value);
  };

  unsubscribe = (f: ObserverFn<T>) => {
    this.observers.delete(f);
  };

  notify: ObserverFn<T> = (data) => {
    this.value = data;
    this.observers.forEach((origin, fn) => {
      if (this.boundary) {
        try {
          fn(data);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Error in observer ${this.name} calling for ${origin}`);
          for (const onError of this.onError) {
            onError(err);
          }
          throw err;
        }
      } else {
        fn(data);
      }
    });
  };
}
