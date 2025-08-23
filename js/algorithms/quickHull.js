/**
 * Convex Hull - QuickHull Algorithm
 * This implementation computes the convex hull of a set of points using the QuickHull algorithm.
 * QuickHull is a divide-and-conquer algorithm that recursively finds the hull by partitioning points,
 * based on their position relative to the line formed by the leftmost and rightmost points.
 * It finds the farthest point from the line, divides the remaining points into upper and lower sets,
 * and recursively processes these sets until the hull is complete.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Quickhull
 *   - https://www.youtube.com/watch?v=NYwgnBuGaxo - Mod-04 Lec-09 Quick Hull by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - (General info, not about Quick Hull) Chapter 1, Section 1 "Convex Hulls", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class QuickHullAlgorithm {
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

    // Step 1: Find leftmost and rightmost points
    let leftmost = this.points[0];
    let rightmost = this.points[0];
    let leftIndex = 0;
    let rightIndex = 0;

    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].x < leftmost.x) {
        leftmost = this.points[i];
        leftIndex = i;
      }
      if (this.points[i].x > rightmost.x) {
        rightmost = this.points[i];
        rightIndex = i;
      }
    }

    this.steps.push({
      description: `Found extreme points: Left (${leftmost.x.toFixed(
        1
      )}, ${leftmost.y.toFixed(1)}), Right (${rightmost.x.toFixed(
        1
      )}, ${rightmost.y.toFixed(1)})`,
      hull: [leftmost, rightmost],
      points: [...this.points],
      highlightedPoints: [leftIndex, rightIndex],
      currentLine: [leftmost, rightmost],
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: i === leftIndex || i === rightIndex ? "accepted" : "pending",
        })),

        eventQueue: [{ label: `Init line L-R`, status: "processed" }],
        activeSet: [
          {
            label: `Left (${leftmost.x.toFixed(1)}, ${leftmost.y.toFixed(1)})`,
            status: "active",
            point: leftmost,
          },
          {
            label: `Right (${rightmost.x.toFixed(1)}, ${rightmost.y.toFixed(
              1
            )})`,
            status: "active",
            point: rightmost,
          },
        ],
        output: [],
      },
    });

    // Step 2: Divide points into upper and lower sets
    const upperSet = [];
    const lowerSet = [];

    for (let i = 0; i < this.points.length; i++) {
      if (i === leftIndex || i === rightIndex) continue;

      const point = this.points[i];
      const cross = Point.crossProduct(leftmost, rightmost, point);

      if (cross > 0) {
        upperSet.push({ point, index: i });
      } else if (cross < 0) {
        lowerSet.push({ point, index: i });
      }
    }

    this.steps.push({
      description: `Divided points: ${upperSet.length} above line, ${lowerSet.length} below line`,
      hull: [leftmost, rightmost],
      points: [...this.points],
      highlightedPoints: [leftIndex, rightIndex],
      currentLine: [leftmost, rightmost],
      upperSet: upperSet.map((p) => p.index),
      lowerSet: lowerSet.map((p) => p.index),
      algorithmStep: 1,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status:
            i === leftIndex || i === rightIndex
              ? "accepted"
              : upperSet.some((up) => up.index === i)
              ? "upper"
              : lowerSet.some((lp) => lp.index === i)
              ? "lower"
              : "rejected",
        })),

        eventQueue: [
          { label: `Partition to upper/lower`, status: "processed" },
        ],
        activeSet: [
          ...upperSet.map((ps) => ({
            label: `Upper P${ps.index + 1}`,
            status: "active",
            point: ps.point,
          })),
          ...lowerSet.map((ps) => ({
            label: `Lower P${ps.index + 1}`,
            status: "active",
            point: ps.point,
          })),
        ],
        output: [],
      },
    });

    // Step 3: Recursively find hull
    const upperHull = [];
    const lowerHull = [];

    // Process upper and lower sets
    this.findHull(upperSet, leftmost, rightmost, "upper", upperHull);
    this.findHull(lowerSet, rightmost, leftmost, "lower", lowerHull);

    // Combine the hulls for the final result
    this.hull = [];
    this.hull.push(leftmost);
    this.hull = this.hull.concat(upperHull);
    this.hull.push(rightmost);
    // Append lower hull in the natural order (rightmost -> leftmost)
    // generated by findHull(rightmost, leftmost). Do not reverse; reversing
    // would create a long edge from rightmost back toward leftmost and
    // produce self-intersections.
    this.hull = this.hull.concat(lowerHull);

    // Show the final hull
    this.steps.push({
      description: `QuickHull complete! Hull has ${this.hull.length} vertices`,
      hull: [...this.hull],
      points: [...this.points],
      highlightedPoints: [],
      currentLine: null,
      algorithmStep: 5,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: this.hull.some((hp) => hp.equals(p))
            ? "accepted"
            : "rejected",
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

  findHull(pointSet, p1, p2, side, hullPart) {
    if (pointSet.length === 0) return;

    // Find the point farthest from the line p1-p2
    let farthestPoint = null;
    let farthestIndex = -1;
    let maxDistance = 0;

    for (const pointData of pointSet) {
      const point = pointData.point;
      const distance = this.distanceFromLine(point, p1, p2);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestPoint = point;
        farthestIndex = pointData.index;
      }
    }

    if (!farthestPoint) return;

    // Create a temporary hull for visualization
    const currentHull = [...this.hull];
    if (!currentHull.some((p) => p.equals(farthestPoint))) {
      currentHull.push(farthestPoint);
    }

    this.steps.push({
      description: `${
        side === "upper" ? "Upper" : "Lower"
      } hull: Found farthest point (${farthestPoint.x.toFixed(
        1
      )}, ${farthestPoint.y.toFixed(1)}) at distance ${maxDistance.toFixed(2)}`,
      hull: currentHull,
      points: [...this.points],
      highlightedPoints: [
        this.points.indexOf(p1),
        this.points.indexOf(p2),
        farthestIndex,
      ],
      currentLine: [p1, p2],
      farthestPoint: farthestPoint,
      algorithmStep: side === "upper" ? 2 : 4,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: currentHull.some((hp) => hp.equals(p))
            ? "accepted"
            : i === farthestIndex
            ? "current"
            : pointSet.some((ps) => ps.index === i)
            ? side === "upper"
              ? "upper"
              : "lower"
            : "rejected",
        })),

        eventQueue: [
          { label: `Find farthest from segment`, status: "processed" },
        ],
        activeSet: [
          {
            label: `Segment (${p1.x.toFixed(1)},${p1.y.toFixed(
              1
            )})→(${p2.x.toFixed(1)},${p2.y.toFixed(1)})`,
            status: "active",
          },
          {
            label: `Farthest P${farthestIndex + 1}`,
            status: "current",
            point: farthestPoint,
          },
        ],
        output: [],
      },
    });

    // Divide remaining points
    const leftSet = [];
    const rightSet = [];

    for (const pointData of pointSet) {
      if (pointData.index === farthestIndex) continue;

      const point = pointData.point;

      // Check if point is on the left side of p1-farthestPoint
      if (Point.crossProduct(p1, farthestPoint, point) > 0) {
        leftSet.push(pointData);
      }
      // Check if point is on the left side of farthestPoint-p2
      else if (Point.crossProduct(farthestPoint, p2, point) > 0) {
        rightSet.push(pointData);
      }
    }

    this.steps.push({
      description: `Divided remaining points: ${leftSet.length} left of triangle, ${rightSet.length} right of triangle`,
      hull: currentHull,
      points: [...this.points],
      highlightedPoints: [farthestIndex],
      currentLine: null,
      triangleLines: [
        [p1, farthestPoint],
        [farthestPoint, p2],
      ],
      algorithmStep: side === "upper" ? 3 : 4,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: currentHull.some((hp) => hp.equals(p))
            ? "accepted"
            : leftSet.some((ls) => ls.index === i)
            ? "left"
            : rightSet.some((rs) => rs.index === i)
            ? "right"
            : "rejected",
        })),

        eventQueue: [{ label: `Split by triangle lines`, status: "processed" }],
        activeSet: [
          ...leftSet.map((ps) => ({
            label: `Left P${ps.index + 1}`,
            status: "active",
            point: ps.point,
          })),
          ...rightSet.map((ps) => ({
            label: `Right P${ps.index + 1}`,
            status: "active",
            point: ps.point,
          })),
        ],
        output: [],
      },
    });

    // Recursively find hull for left and right sets
    // IMPORTANT: add the farthest point BETWEEN the recursive calls
    // so that hull points are emitted in sequence along the edge p1->p2.
    // Adding before recursion can scramble order and create self-intersections.
    this.findHull(leftSet, p1, farthestPoint, side, hullPart);

    // Add the farthest point to hull after processing the left subset
    hullPart.push(farthestPoint);

    this.findHull(rightSet, farthestPoint, p2, side, hullPart);
  }

  distanceFromLine(point, lineStart, lineEnd) {
    const A = lineEnd.y - lineStart.y;
    const B = lineStart.x - lineEnd.x;
    const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;

    return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B);
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
