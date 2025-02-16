import type { Sim } from "@core/sim";
import { Observable } from "@core/utils/observer";
import { actionLoader } from "@core/actionLoader";
import { System } from "../system";

export const frameData = new Observable<number[]>("frameData", false);
frameData.value = [];

export class AvgFrameReportingSystem extends System {
  start = 0;
  iterations = 0;
  accumulator = 0;
  reporting = false;

  apply(sim: Sim): void {
    super.apply(sim);

    actionLoader.register(
      {
        type: "basic",
        slug: "avgFrameTie",
        name: "Average frame time",
        category: "performance",
        description: "Toggle average frame time reporting",
        fn: () => {
          this.reporting = !this.reporting;
          if (!this.reporting) {
            frameData.notify([]);
          }
        },
      },
      this.constructor.name
    );

    sim.hooks.phase.start.subscribe(this.constructor.name, () => {
      this.start = performance.now();
    });

    sim.hooks.phase.end.subscribe(this.constructor.name, (delta) => {
      if (!this.reporting || delta === 0) return;

      this.accumulator += performance.now() - this.start;
      this.iterations++;

      if (this.iterations === 60) {
        // eslint-disable-next-line no-console
        const newData = frameData.value.slice();
        newData.unshift(this.accumulator / 60);
        if (newData.length > 31) {
          newData.pop();
        }
        frameData.notify(newData);
        this.iterations = 0;
        this.accumulator = 0;
      }
    });
  }
}
