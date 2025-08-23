/**
 * Line Sweep - Area of Union of Rectangles
 * This algorithm computes the union area of a set of rectangles using a line sweep technique.
 * The event queue consists of rectangle start and end events, processed in order of their x-coordinates.
 * It maintains an active set of rectangles that intersect the current sweep line.
 * It calculates the area contribution from the active rectangles at each step.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Sweep_line_algorithm
 *   - https://www.youtube.com/watch?v=JwlKLYjP1R8 - Mod-03 Lec-06 Line Sweep: Rectangle Union by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 */

class RectangleUnionAlgorithm {
  constructor() {
    this.rectangles = [];
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
    this.totalArea = 0;
  }

  addRectangle(rectangle) {
    this.rectangles.push(rectangle);
    this.reset();
  }

  removeRectangle(rectangle) {
    const index = this.rectangles.findIndex((r) => r.equals(rectangle));
    if (index !== -1) {
      this.rectangles.splice(index, 1);
      this.reset();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
    this.totalArea = 0;
  }

  clear() {
    this.rectangles = [];
    this.reset();
  }

  computeSteps() {
    if (this.rectangles.length === 0) {
      this.steps = [
        {
          description: "No rectangles to process",
          rectangles: [],
          events: [],
          sweepLine: null,
          activeRectangles: [],
          currentArea: 0,
          totalArea: 0,
          eventSets: {
            rectangles: [],
            events: [],
          },
        },
      ];
      return;
    }

    this.steps = [];
    this.totalArea = 0;

    // Step 1: Show all rectangles
    this.steps.push({
      description: `Starting with ${this.rectangles.length} rectangles`,
      rectangles: [...this.rectangles],
      events: [],
      sweepLine: null,
      activeRectangles: [],
      currentArea: 0,
      totalArea: 0,
      algorithmStep: 0,
      eventSets: {
        rectangles: this.rectangles.map((r, i) => ({
          rectangle: r,
          index: i,
          status: "pending",
        })),
        events: [],
      },
    });

    // Create events for rectangle boundaries
    const events = [];
    for (let i = 0; i < this.rectangles.length; i++) {
      const rect = this.rectangles[i];
      events.push({
        x: rect.x1,
        type: "start",
        rectangle: rect,
        index: i,
      });
      events.push({
        x: rect.x2,
        type: "end",
        rectangle: rect,
        index: i,
      });
    }

    // Sort events by x-coordinate
    events.sort((a, b) => {
      if (Math.abs(a.x - b.x) < 0.001) {
        // If same x, process "start" events before "end" events
        return a.type === "start" ? -1 : 1;
      }
      return a.x - b.x;
    });

    // Step 2: Show sorted events
    this.steps.push({
      description: `Created ${events.length} events and sorted by x-coordinate`,
      rectangles: [...this.rectangles],
      events: [...events],
      sweepLine: null,
      activeRectangles: [],
      currentArea: 0,
      totalArea: 0,
      algorithmStep: 1,
      eventSets: {
        rectangles: this.rectangles.map((r, i) => ({
          rectangle: r,
          index: i,
          status: "sorted",
        })),
        events: events.map((e, i) => ({
          event: e,
          index: i,
          status: "pending",
        })),
        eventQueue: events.map((e) => ({
          label: `${e.type.toUpperCase()} rect ${e.index + 1} @ x=${e.x.toFixed(
            1
          )}`,
          status: "pending",
          ...e,
        })),
        activeSet: [],
        output: [],
      },
    });

    // Process events with line sweep
    const activeRectangles = [];
    let totalArea = 0;
    let lastX = events.length > 0 ? events[0].x : 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Calculate area contribution from previous sweep line position
      if (activeRectangles.length > 0 && event.x > lastX) {
        const width = event.x - lastX;
        const height = this.calculateUnionHeight(activeRectangles);
        const areaContribution = width * height;
        totalArea += areaContribution;

        this.steps.push({
          description: `Area contribution: ${width.toFixed(
            1
          )} × ${height.toFixed(1)} = ${areaContribution.toFixed(1)}`,
          rectangles: [...this.rectangles],
          events: [...events],
          sweepLine: lastX,
          activeRectangles: [...activeRectangles],
          currentArea: areaContribution,
          totalArea: totalArea,
          algorithmStep: 2 + i,
          eventSets: {
            rectangles: this.rectangles.map((r, j) => ({
              rectangle: r,
              index: j,
              status: activeRectangles.includes(r) ? "active" : "pending",
            })),
            events: events.map((e, j) => ({
              event: e,
              index: j,
              status: j === i ? "current" : j < i ? "processed" : "pending",
            })),
            eventQueue: events.map((e, j) => ({
              label: `${e.type.toUpperCase()} rect ${
                e.index + 1
              } @ x=${e.x.toFixed(1)}`,
              status: j < i ? "processed" : j === i ? "current" : "pending",
              ...e,
            })),
            activeSet: activeRectangles.map((r) => ({
              label: `Rect ${this.rectangles.indexOf(r) + 1} Y=[${r.y1.toFixed(
                1
              )}, ${r.y2.toFixed(1)}]`,
              status: "active",
              rectangle: r,
            })),
            output: [{ width, height, area: areaContribution, status: "new" }],
          },
        });
      }

      // Process current event
      if (event.type === "start") {
        activeRectangles.push(event.rectangle);
      } else {
        const index = activeRectangles.indexOf(event.rectangle);
        if (index !== -1) {
          activeRectangles.splice(index, 1);
        }
      }

      this.steps.push({
        description: `Processing ${event.type} event at x = ${event.x.toFixed(
          1
        )} for rectangle ${event.index + 1}`,
        rectangles: [...this.rectangles],
        events: [...events],
        sweepLine: event.x,
        activeRectangles: [...activeRectangles],
        currentArea: 0,
        totalArea: totalArea,
        algorithmStep: 2 + i,
        eventSets: {
          rectangles: this.rectangles.map((r, j) => ({
            rectangle: r,
            index: j,
            status: activeRectangles.includes(r)
              ? "active"
              : r === event.rectangle
              ? "current"
              : "pending",
          })),
          events: events.map((e, j) => ({
            event: e,
            index: j,
            status: j === i ? "current" : j < i ? "processed" : "pending",
          })),
          eventQueue: events.map((e, j) => ({
            label: `${e.type.toUpperCase()} rect ${
              e.index + 1
            } @ x=${e.x.toFixed(1)}`,
            status: j < i ? "processed" : j === i ? "current" : "pending",
            ...e,
          })),
          activeSet: activeRectangles.map((r) => ({
            label: `Rect ${this.rectangles.indexOf(r) + 1} Y=[${r.y1.toFixed(
              1
            )}, ${r.y2.toFixed(1)}]`,
            status: "active",
            rectangle: r,
          })),
          output: [],
        },
      });

      lastX = event.x;
    }

    // Final step
    this.totalArea = totalArea;
    this.steps.push({
      description: `Union area calculation complete! Total area: ${totalArea.toFixed(
        1
      )}`,
      rectangles: [...this.rectangles],
      events: [...events],
      sweepLine: null,
      activeRectangles: [],
      currentArea: 0,
      totalArea: totalArea,
      algorithmStep: 100,
      eventSets: {
        rectangles: this.rectangles.map((r, i) => ({
          rectangle: r,
          index: i,
          status: "completed",
        })),
        events: events.map((e, i) => ({
          event: e,
          index: i,
          status: "completed",
        })),
      },
    });
  }

  calculateUnionHeight(activeRectangles) {
    if (activeRectangles.length === 0) return 0;

    // Create intervals for y-coordinates
    const intervals = activeRectangles.map((rect) => ({
      start: rect.y1,
      end: rect.y2,
    }));

    // Sort intervals by start position
    intervals.sort((a, b) => a.start - b.start);

    // Merge overlapping intervals
    const merged = [];
    let current = intervals[0];

    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      if (next.start <= current.end) {
        // Overlapping intervals, merge them
        current.end = Math.max(current.end, next.end);
      } else {
        // Non-overlapping, add current and start new
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);

    // Calculate total height
    return merged.reduce(
      (total, interval) => total + (interval.end - interval.start),
      0
    );
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
    return this.steps[this.currentStep] || this.steps[0];
  }

  nextStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      return true;
    }
    return false;
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      return true;
    }
    return false;
  }

  canGoNext() {
    return this.currentStep < this.steps.length - 1;
  }

  canGoPrev() {
    return this.currentStep > 0;
  }
}
