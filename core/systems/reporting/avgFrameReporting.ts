import type { Sim } from "@core/sim";
import { System } from "../system";

export class AvgFrameReportingSystem extends System {
  start = 0;
  iterations = 0;
  accumulator = 0;
  reporting = false;

  apply(sim: Sim): void {
    super.apply(sim);

    this.sim.actions.register(
      {
        type: "basic",
        slug: "avgFrameTie",
        name: "Average frame time",
        category: "performance",
        description: "Toggle average frame time reporting",
        fn: () => {
          this.reporting = !this.reporting;
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
        console.log("Avg frame time: ", (this.accumulator / 60).toFixed(2));
        this.iterations = 0;
        this.accumulator = 0;
      }
    });
  }
}
