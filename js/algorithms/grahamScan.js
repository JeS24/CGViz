/**
 * Convex Hull - The Graham Scan Algorithm
 * This implementation computes the convex hull of a set of points in 2D space using the Graham scan method.
 * It sorts the points by polar angle with respect to a reference point and constructs the hull iteratively.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Convex_hull
 *   - https://en.wikipedia.org/wiki/Graham_scan
 *   - https://www.youtube.com/watch?v=Y_X_eekYXEI - Mod-04 Lec-08 Convex Hull Contd by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Chapter 2, "Convex Hulls", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 *   - Chapter 6, Section 3, "Finding Convex Hulls: Graham Scan", in "Computational Geometry and Computer Graphics in C++" by Laszlo et al.
 */

class GrahamScanAlgorithm {
  constructor() {
    this.points = [];
    this.steps = [];
    this.currentStep = 0;
    this.hull = [];
    this.sortedPoints = [];
    this.algorithmStep = 0;
  }

  addPoint(point) {
    this.points.push(point);
    this.reset();
  }

  removePoint(point) {
    const index = this.points.findIndex(
      (p) => Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10
    );
    if (index !== -1) {
      this.points.splice(index, 1);
      this.reset();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.hull = [];
    this.sortedPoints = [];
    this.algorithmStep = 0;
  }

  clear() {
    this.points = [];
    this.reset();
  }

  computeSteps() {
    if (this.points.length < 3) {
      this.steps = [
        {
          description: "Need at least 3 points for convex hull",
          hull: [],
          sortedPoints: [...this.points],
          highlightedPoints: [],
          acceptedPoints: [],
          rejectedPoints: [],
          eventSets: {
            points: this.points.map((p, i) => ({
              point: p,
              index: i,
              status: "pending",
            })),

            eventQueue: this.points.map((p, i) => ({
              label: `P${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
              status: "pending",
              point: p,
            })),
            activeSet: [],
            output: [],
          },
        },
      ];
      return;
    }

    this.steps = [];

    // Step 1: Find the bottom-most point (or, leftmost, in case of tie)
    let bottom = this.points[0];
    let bottomIndex = 0;
    for (let i = 1; i < this.points.length; i++) {
      if (
        this.points[i].y > bottom.y ||
        (this.points[i].y === bottom.y && this.points[i].x < bottom.x)
      ) {
        bottom = this.points[i];
        bottomIndex = i;
      }
    }

    this.steps.push({
      description: `Found bottom-most point: (${bottom.x.toFixed(
        1
      )}, ${bottom.y.toFixed(1)})`,
      hull: [],
      sortedPoints: [...this.points],
      highlightedPoints: [bottomIndex],
      acceptedPoints: [bottomIndex],
      rejectedPoints: [],
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: i === bottomIndex ? "accepted" : "pending",
        })),

        eventQueue: this.points.map((p, i) => ({
          label: `P${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
          status: i === bottomIndex ? "processed" : "pending",
          point: p,
        })),
        activeSet: [
          {
            label: `Hull seed P${bottomIndex + 1}`,
            status: "active",
            point: bottom,
          },
        ],
        output: [],
      },
    });

    // Step 2: Sort points by polar angle with respect to bottom point
    const otherPoints = this.points.filter((p, i) => i !== bottomIndex);
    otherPoints.sort((a, b) => {
      const angleA = Point.polarAngle(bottom, a);
      const angleB = Point.polarAngle(bottom, b);
      if (Math.abs(angleA - angleB) < 1e-9) {
        return Point.distance(bottom, a) - Point.distance(bottom, b);
      }
      return angleA - angleB;
    });

    this.sortedPoints = [bottom, ...otherPoints];

    this.steps.push({
      description: "Sorted points by polar angle from bottom point",
      hull: [],
      sortedPoints: [...this.sortedPoints],
      highlightedPoints: [],
      acceptedPoints: [0],
      rejectedPoints: [],
      algorithmStep: 1,
      eventSets: {
        points: this.sortedPoints.map((p, i) => ({
          point: p,
          index: i,
          status: i === 0 ? "accepted" : "pending",
          angle: i === 0 ? 0 : Point.polarAngle(bottom, p),
        })),

        eventQueue: this.sortedPoints.map((p, i) => ({
          label: `P${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
          status: i === 0 ? "processed" : "pending",
          point: p,
        })),
        activeSet: [{ label: `Hull stack: P1`, status: "active" }],
        output: [],
      },
    });

    // Step 3: Graham scan
    const stack = [this.sortedPoints[0], this.sortedPoints[1]];
    const acceptedIndices = [0, 1];
    const rejectedIndices = [];

    this.steps.push({
      description: "Initialize stack with first two points",
      hull: [...stack],
      sortedPoints: [...this.sortedPoints],
      highlightedPoints: [0, 1],
      acceptedPoints: [...acceptedIndices],
      rejectedPoints: [...rejectedIndices],
      algorithmStep: 2,
      eventSets: {
        points: this.sortedPoints.map((p, i) => ({
          point: p,
          index: i,
          status: i <= 1 ? "accepted" : "pending",
          angle: i === 0 ? 0 : Point.polarAngle(bottom, p),
        })),

        eventQueue: this.sortedPoints.map((p, i) => ({
          label: `P${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
          status: i <= 1 ? "processed" : "pending",
          point: p,
        })),
        activeSet: stack.map((p) => ({
          label: `Hull P${this.sortedPoints.indexOf(p) + 1}`,
          status: "active",
          point: p,
        })),
        output: [],
      },
    });

    for (let i = 2; i < this.sortedPoints.length; i++) {
      let backtrackOccurred = false;

      // Remove points that make clockwise turn
      while (stack.length > 1) {
        const cross = Point.crossProduct(
          stack[stack.length - 2],
          stack[stack.length - 1],
          this.sortedPoints[i]
        );

        if (cross > 0) break; // Counter-clockwise turn, keep the point

        const removed = stack.pop();
        const removedIndex = acceptedIndices.pop();
        rejectedIndices.push(removedIndex);
        backtrackOccurred = true;

        this.steps.push({
          description: `Backtrack: Removed point (${removed.x.toFixed(
            1
          )}, ${removed.y.toFixed(1)}) - clockwise turn detected`,
          hull: [...stack],
          sortedPoints: [...this.sortedPoints],
          highlightedPoints: [i],
          acceptedPoints: [...acceptedIndices],
          rejectedPoints: [...rejectedIndices],
          algorithmStep: backtrackOccurred ? 2 : 4, // Go back to processing step
          isBacktrack: true,
          eventSets: {
            points: this.sortedPoints.map((p, j) => ({
              point: p,
              index: j,
              status: acceptedIndices.includes(j)
                ? "accepted"
                : rejectedIndices.includes(j)
                ? "rejected"
                : j === i
                ? "current"
                : "pending",
              angle: j === 0 ? 0 : Point.polarAngle(bottom, p),
            })),

            eventQueue: this.sortedPoints.map((p, j) => ({
              label: `P${j + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
              status: j < i ? "processed" : j === i ? "current" : "pending",
              point: p,
            })),
            activeSet: stack.map((p) => ({
              label: `Hull P${this.sortedPoints.indexOf(p) + 1}`,
              status: "active",
              point: p,
            })),
            output: [
              {
                label: `Removed P${
                  this.sortedPoints.indexOf(removed) + 1
                } (clockwise)`,
                status: "new",
                point: removed,
              },
            ],
          },
        });
      }

      stack.push(this.sortedPoints[i]);
      acceptedIndices.push(i);

      this.steps.push({
        description: `Added point (${this.sortedPoints[i].x.toFixed(
          1
        )}, ${this.sortedPoints[i].y.toFixed(1)}) to hull`,
        hull: [...stack],
        sortedPoints: [...this.sortedPoints],
        highlightedPoints: [i],
        acceptedPoints: [...acceptedIndices],
        rejectedPoints: [...rejectedIndices],
        algorithmStep: 3,
        eventSets: {
          points: this.sortedPoints.map((p, j) => ({
            point: p,
            index: j,
            status: acceptedIndices.includes(j)
              ? "accepted"
              : rejectedIndices.includes(j)
              ? "rejected"
              : j > i
              ? "pending"
              : "processed",
            angle: j === 0 ? 0 : Point.polarAngle(bottom, p),
          })),

          eventQueue: this.sortedPoints.map((p, j) => ({
            label: `P${j + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
            status: j < i ? "processed" : j === i ? "current" : "pending",
            point: p,
          })),
          activeSet: stack.map((p) => ({
            label: `Hull P${this.sortedPoints.indexOf(p) + 1}`,
            status: "active",
            point: p,
          })),
          output: [
            {
              label: `Accepted P${i + 1}`,
              status: "new",
              point: this.sortedPoints[i],
            },
          ],
        },
      });
    }

    this.steps.push({
      description: `Convex hull complete with ${stack.length} vertices`,
      hull: [...stack],
      sortedPoints: [...this.sortedPoints],
      highlightedPoints: [],
      acceptedPoints: [...acceptedIndices],
      rejectedPoints: [...rejectedIndices],
      algorithmStep: 5,
      eventSets: {
        points: this.sortedPoints.map((p, j) => ({
          point: p,
          index: j,
          status: acceptedIndices.includes(j) ? "accepted" : "rejected",
          angle: j === 0 ? 0 : Point.polarAngle(bottom, p),
        })),

        eventQueue: [],
        activeSet: stack.map((p) => ({
          label: `Hull P${this.sortedPoints.indexOf(p) + 1}`,
          status: "active",
          point: p,
        })),
        output: stack.map((p, idx) => ({
          label: `Hull ${idx + 1}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
          status: "completed",
          point: p,
        })),
      },
    });
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
