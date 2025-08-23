/**
 * Convex Hull - The Gift Wrapping Algorithm (Jarvis March)
 * This implementation computes the convex hull of a set of points in 2D space via "gift wrapping".
 * It iteratively finds the next point on the hull by selecting the most counter-clockwise point relative to the current hull point.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Convex_hull
 *   - https://en.wikipedia.org/wiki/Gift_wrapping_algorithm
 *   - https://www.youtube.com/watch?v=QnL0LmOO4rc - Mod-04 Lec-07 Convex Hull by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - "On the identification of the convex hull of a finite set of points in the plane" by R.A., Jarvis (https://www.sciencedirect.com/science/article/abs/pii/0020019073900203)
 *   - Chapter 6, Section 2, "Finding Convex Hulls: Gift-Wrapping", in "Computational Geometry and Computer Graphics in C++" by Laszlo et al.
 */

class GiftWrapAlgorithm {
  constructor() {
    this.points = [];
    this.steps = [];
    this.currentStep = 0;
    this.hull = [];
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
          points: [...this.points],
          highlightedPoints: [],
          currentLine: null,
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
    this.hull = [];

    // Step 1: Find the leftmost point
    let leftmost = this.points[0];
    let leftmostIndex = 0;
    for (let i = 1; i < this.points.length; i++) {
      if (
        this.points[i].x < leftmost.x ||
        (this.points[i].x === leftmost.x && this.points[i].y < leftmost.y)
      ) {
        leftmost = this.points[i];
        leftmostIndex = i;
      }
    }

    this.steps.push({
      description: `Found leftmost point: (${leftmost.x.toFixed(
        1
      )}, ${leftmost.y.toFixed(1)})`,
      hull: [],
      points: [...this.points],
      highlightedPoints: [leftmostIndex],
      currentLine: null,
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: i === leftmostIndex ? "accepted" : "pending",
        })),

        eventQueue: this.points.map((p, i) => ({
          label: `P${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
          status: i === leftmostIndex ? "processed" : "pending",
          point: p,
        })),
        activeSet: [
          {
            label: `Hull seed P${leftmostIndex + 1}`,
            status: "active",
            point: leftmost,
          },
        ],
        output: [],
      },
    });

    // Step 2: Gift wrapping
    let currentPoint = leftmost;
    let currentIndex = leftmostIndex;
    const acceptedIndices = [leftmostIndex];

    do {
      this.hull.push(currentPoint);

      // Find the most counter-clockwise point
      let nextPoint = this.points[0];
      let nextIndex = 0;

      // Skip if it's the same as current point
      if (nextIndex === currentIndex) {
        nextPoint = this.points[1];
        nextIndex = 1;
      }

      this.steps.push({
        description: `From point (${currentPoint.x.toFixed(
          1
        )}, ${currentPoint.y.toFixed(
          1
        )}), testing candidate (${nextPoint.x.toFixed(
          1
        )}, ${nextPoint.y.toFixed(1)})`,
        hull: [...this.hull],
        points: [...this.points],
        highlightedPoints: [currentIndex, nextIndex],
        currentLine: [currentPoint, nextPoint],
        algorithmStep: 1,
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: acceptedIndices.includes(i)
              ? "accepted"
              : i === currentIndex
              ? "current"
              : i === nextIndex
              ? "candidate"
              : "pending",
          })),

          eventQueue: this.points.map((p, i) => ({
            label: `Test vs candidate P${nextIndex + 1}`,
            status:
              i === currentIndex || i === nextIndex ? "current" : "pending",
          })),
          activeSet: [
            {
              label: `Current P${currentIndex + 1}`,
              status: "active",
              point: currentPoint,
            },
            {
              label: `Candidate P${nextIndex + 1}`,
              status: "active",
              point: nextPoint,
            },
          ],
          output: [],
        },
      });

      // Test all other points - very slow
      for (let i = 0; i < this.points.length; i++) {
        if (i === currentIndex || i === nextIndex) continue;

        const testPoint = this.points[i];
        const orientation = Point.crossProduct(
          currentPoint,
          nextPoint,
          testPoint
        );

        this.steps.push({
          description: `Testing point (${testPoint.x.toFixed(
            1
          )}, ${testPoint.y.toFixed(1)}) - ${
            orientation > 0
              ? "more counter-clockwise"
              : orientation < 0
              ? "clockwise"
              : "collinear"
          }`,
          hull: [...this.hull],
          points: [...this.points],
          highlightedPoints: [currentIndex, nextIndex, i],
          currentLine: [currentPoint, nextPoint],
          testLine: [currentPoint, testPoint],
          algorithmStep: 2,
          eventSets: {
            points: this.points.map((p, j) => ({
              point: p,
              index: j,
              status: acceptedIndices.includes(j)
                ? "accepted"
                : j === currentIndex
                ? "current"
                : j === nextIndex
                ? "candidate"
                : j === i
                ? "testing"
                : "pending",
            })),

            eventQueue: [
              {
                label: `Compare candidate P${nextIndex + 1} vs test P${i + 1}`,
                status: "current",
              },
            ],
            activeSet: [
              {
                label: `Current P${currentIndex + 1}`,
                status: "active",
                point: currentPoint,
              },
              {
                label: `Candidate P${nextIndex + 1}`,
                status: "active",
                point: nextPoint,
              },
              { label: `Test P${i + 1}`, status: "active", point: testPoint },
            ],
            output: [],
          },
        });

        // If testPoint is more counter-clockwise than nextPoint, update nextPoint
        if (
          orientation > 0 ||
          (orientation === 0 &&
            Point.distance(currentPoint, testPoint) >
              Point.distance(currentPoint, nextPoint))
        ) {
          nextPoint = testPoint;
          nextIndex = i;

          this.steps.push({
            description: `New best candidate: (${nextPoint.x.toFixed(
              1
            )}, ${nextPoint.y.toFixed(1)})`,
            hull: [...this.hull],
            points: [...this.points],
            highlightedPoints: [currentIndex, nextIndex],
            currentLine: [currentPoint, nextPoint],
            algorithmStep: 3,
            eventSets: {
              points: this.points.map((p, j) => ({
                point: p,
                index: j,
                status: acceptedIndices.includes(j)
                  ? "accepted"
                  : j === currentIndex
                  ? "current"
                  : j === nextIndex
                  ? "candidate"
                  : "pending",
              })),

              eventQueue: [
                {
                  label: `Update candidate -> P${nextIndex + 1}`,
                  status: "processed",
                },
              ],
              activeSet: [
                {
                  label: `Current P${currentIndex + 1}`,
                  status: "active",
                  point: currentPoint,
                },
                {
                  label: `Candidate P${nextIndex + 1}`,
                  status: "active",
                  point: nextPoint,
                },
              ],
              output: [],
            },
          });
        }
      }

      // Move to the next point
      currentPoint = nextPoint;
      currentIndex = nextIndex;
      acceptedIndices.push(nextIndex);

      this.steps.push({
        description: `Selected next hull point: (${currentPoint.x.toFixed(
          1
        )}, ${currentPoint.y.toFixed(1)})`,
        hull: [...this.hull],
        points: [...this.points],
        highlightedPoints: [currentIndex],
        currentLine: null,
        algorithmStep: 4,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: acceptedIndices.includes(j) ? "accepted" : "pending",
          })),

          eventQueue: [
            {
              label: `Advance hull to P${currentIndex + 1}`,
              status: "processed",
            },
          ],
          activeSet: this.hull.map((hp) => ({
            label: `Hull (${hp.x.toFixed(1)}, ${hp.y.toFixed(1)})`,
            status: "active",
            point: hp,
          })),
          output: [
            {
              label: `Accepted P${currentIndex + 1}`,
              status: "new",
              point: currentPoint,
            },
          ],
        },
      });
    } while (currentPoint !== leftmost);

    this.steps.push({
      description: `Gift wrapping complete! Hull has ${this.hull.length} vertices`,
      hull: [...this.hull],
      points: [...this.points],
      highlightedPoints: [],
      currentLine: null,
      algorithmStep: 5,
      eventSets: {
        points: this.points.map((p, j) => ({
          point: p,
          index: j,
          status: acceptedIndices.includes(j) ? "accepted" : "rejected",
        })),

        eventQueue: [],
        activeSet: this.hull.map((hp) => ({
          label: `Hull (${hp.x.toFixed(1)}, ${hp.y.toFixed(1)})`,
          status: "active",
          point: hp,
        })),
        output: this.hull.map((hp, idx) => ({
          label: `Hull ${idx + 1}: (${hp.x.toFixed(1)}, ${hp.y.toFixed(1)})`,
          status: "completed",
          point: hp,
        })),
      },
    });
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.steps.length === 0) return null;
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
