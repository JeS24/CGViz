/**
 * Point-Line Duality Visualization
 * This implements a specific kind of point-line duality, that preserves incidence relationships:
 * * Point (a, b) maps to line y = ax - b
 * * Line y = mx + c maps to point (m, -c)
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Duality_(projective_geometry)
 *   - https://www.youtube.com/watch?v=0-k4xsvnnXU - Mod-05 Lec-11 Intersection of Half Planes and Duality by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - https://www.youtube.com/watch?v=7eVa6N-28SQ - Mod-05 Lec-12 Intersection of Half Planes and Duality Contd by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Section 8.2, "Duality" in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class DualityAlgorithm {
  constructor() {
    this.points = [];
    this.lines = [];
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
    this.showPoints = true;
    this.showLines = true;
    this.showDualPoints = true;
    this.showDualLines = true;
  }

  addPoint(point) {
    this.points.push(point);
    this.reset();
    this.computeSteps();
  }

  addLine(lineObj) {
    this.lines.push(lineObj);
    this.reset();
    this.computeSteps();
  }

  removePoint(point) {
    const index = this.points.findIndex(
      (p) => Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10
    );
    if (index !== -1) {
      this.points.splice(index, 1);
      this.reset();
      this.computeSteps();
    }
  }

  removeLine(lineObj) {
    const index = this.lines.findIndex(
      (l) =>
        Math.abs(l.slope - lineObj.slope) < 0.1 &&
        Math.abs(l.intercept - lineObj.intercept) < 10
    );
    if (index !== -1) {
      this.lines.splice(index, 1);
      this.reset();
      this.computeSteps();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
  }

  clear() {
    this.points = [];
    this.lines = [];
    this.reset();
  }

  toggleDisplay(type) {
    switch (type) {
      case "points":
        this.showPoints = !this.showPoints;
        break;
      case "lines":
        this.showLines = !this.showLines;
        break;
      case "dualPoints":
        this.showDualPoints = !this.showDualPoints;
        break;
      case "dualLines":
        this.showDualLines = !this.showDualLines;
        break;
    }
  }

  computeSteps() {
    this.steps = [];

    // Step 1: Show initial configuration
    this.steps.push({
      description: `Starting with ${this.points.length} points and ${this.lines.length} lines`,
      points: [...this.points],
      lines: [...this.lines],
      dualPoints: [],
      dualLines: [],
      currentPoint: null,
      currentLine: null,
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "pending",
        })),
        lines: this.lines.map((l, i) => ({
          line: l,
          index: i,
          status: "pending",
        })),

        eventQueue: [
          ...this.points.map((p, i) => ({
            label: `Dual of P${i + 1}`,
            status: "pending",
            point: p,
          })),
          ...this.lines.map((l, i) => ({
            label: `Dual of L${i + 1}`,
            status: "pending",
            line: l,
          })),
        ],
        activeSet: [],
        output: [],
      },
    });

    // Step 2: Explain duality transformation
    this.steps.push({
      description: "Point-Line Duality: Point (a,b) ↔ Line y = ax - b",
      points: [...this.points],
      lines: [...this.lines],
      dualPoints: [],
      dualLines: [],
      currentPoint: null,
      currentLine: null,
      algorithmStep: 1,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "explaining",
        })),
        lines: this.lines.map((l, i) => ({
          line: l,
          index: i,
          status: "explaining",
        })),

        eventQueue: [{ label: "Explain mapping", status: "processed" }],
        activeSet: [],
        output: [],
      },
    });

    // Transform points to dual lines
    const dualLines = [];
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const dualLine = this.pointToDualLine(point);
      dualLines.push(dualLine);

      this.steps.push({
        description: `Point (${point.x.toFixed(1)}, ${point.y.toFixed(
          1
        )}) → Line y = ${point.x.toFixed(1)}x - ${point.y.toFixed(1)}`,
        points: [...this.points],
        lines: [...this.lines],
        dualPoints: [],
        dualLines: dualLines.slice(),
        currentPoint: point,
        currentLine: null,
        currentDualLine: dualLine,
        algorithmStep: 2 + i,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: j === i ? "current" : j < i ? "processed" : "pending",
          })),
          lines: this.lines.map((l, j) => ({
            line: l,
            index: j,
            status: "pending",
          })),

          eventQueue: [
            ...this.points.map((p, j) => ({
              label: `Dual of P${j + 1}`,
              status: j < i ? "processed" : j === i ? "current" : "pending",
              point: p,
            })),
            ...this.lines.map((l, j) => ({
              label: `Dual of L${j + 1}`,
              status: "pending",
              line: l,
            })),
          ],
          activeSet: [{ label: `P${i + 1}`, status: "active", point }],
          output: [{ label: `Dual line of P${i + 1}`, status: "new" }],
        },
      });
    }

    // Transform lines to dual points
    const dualPoints = [];
    for (let i = 0; i < this.lines.length; i++) {
      const lineObj = this.lines[i];
      const dualPoint = this.lineToDualPoint(lineObj);
      dualPoints.push(dualPoint);

      this.steps.push({
        description: `Line y = ${lineObj.slope.toFixed(
          1
        )}x + ${lineObj.intercept.toFixed(1)} → Point (${lineObj.slope.toFixed(
          1
        )}, ${(-lineObj.intercept).toFixed(1)})`,
        points: [...this.points],
        lines: [...this.lines],
        dualPoints: dualPoints.slice(),
        dualLines: [...dualLines],
        currentPoint: null,
        currentLine: lineObj,
        currentDualPoint: dualPoint,
        algorithmStep: 2 + this.points.length + i,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: "processed",
          })),
          lines: this.lines.map((l, j) => ({
            line: l,
            index: j,
            status: j === i ? "current" : j < i ? "processed" : "pending",
          })),

          eventQueue: [
            ...this.lines.map((l, j) => ({
              label: `Dual of L${j + 1}`,
              status: j < i ? "processed" : j === i ? "current" : "pending",
              line: l,
            })),
          ],
          activeSet: [{ label: `L${i + 1}`, status: "active" }],
          output: [{ label: `Dual point of L${i + 1}`, status: "new" }],
        },
      });
    }

    // Final step: Show complete duality
    this.steps.push({
      description: `Duality complete! ${this.points.length} points ↔ ${this.points.length} lines, ${this.lines.length} lines ↔ ${this.lines.length} points`,
      points: [...this.points],
      lines: [...this.lines],
      dualPoints: [...dualPoints],
      dualLines: [...dualLines],
      currentPoint: null,
      currentLine: null,
      algorithmStep: 100,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "completed",
        })),
        lines: this.lines.map((l, i) => ({
          line: l,
          index: i,
          status: "completed",
        })),

        eventQueue: [],
        activeSet: [],
        output: [
          ...dualLines.map((dl, idx) => ({
            label: `Dual line of P${idx + 1}`,
            status: "completed",
          })),
          ...dualPoints.map((dp, idx) => ({
            label: `Dual point of L${idx + 1}`,
            status: "completed",
          })),
        ],
      },
    });
  }

  pointToDualLine(point) {
    // Point (a, b) maps to line y = ax - b
    return {
      slope: point.x,
      intercept: -point.y,
      originalPoint: point,
    };
  }

  lineToDualPoint(lineObj) {
    // Line y = mx + c maps to point (m, -c)
    return {
      x: lineObj.slope,
      y: -lineObj.intercept,
      originalLine: lineObj,
    };
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
