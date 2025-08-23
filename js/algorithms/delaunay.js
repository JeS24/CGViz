/**
 * Delaunay Polygon Triangulation - Bowyer-Watson Algorithm
 * The Bowyer-Watson is an incremental construction algorithm for Delaunay triangulation.
 * It starts with a super triangle that contains all points,then iteratively adds points,
 * checking circumcircles of existing triangles to find bad triangles, and re-triangulates
 * the polygonal hole formed. The algorithm ensures that no triangle's circumcircle
 * contains any other point, thus maximizing the minimum angle of the triangles.
 * This results in a triangulation that avoids skinny triangles.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Delaunay_triangulation
 *   - https://en.wikipedia.org/wiki/Bowyer%E2%80%93Watson_algorithm
 *   - https://www.youtube.com/watch?v=IqdSdbxrTsY - Mod-08 Lec-19 Delaunay Triangulation by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Section 6.6 of "Computational Geometry & Computer Graphics in C++" by Michael J. Laszlo
 *   - Chapter 9 of "Computational Geometry: Algorithms and Applications" by Mark Mark de Berg et al.
 */

class DelaunayBowyerWatson {
  constructor() {
    this.points = [];
    this.steps = [];
    this.currentStep = 0;
    this.triangles = [];
    this.circumcircles = [];
    this.showDuality = false;
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
    this.triangles = [];
    this.circumcircles = [];
  }

  clear() {
    this.points = [];
    this.reset();
  }

  computeSteps() {
    if (this.points.length < 3) {
      this.steps = [
        {
          description: "Need at least 3 points for Delaunay triangulation",
          triangles: [],
          circumcircles: [],
          highlightedPoints: [],
          newPoint: null,
          eventSets: {
            points: this.points.map((p, i) => ({
              point: p,
              index: i,
              status: "pending",
            })),
            triangles: [],
          },
        },
      ];
      return;
    }

    this.steps = [];
    this.triangles = [];
    this.circumcircles = [];

    // Create super triangle that contains all points
    const bounds = this.getBounds();
    const superTriangle = this.createSuperTriangle(bounds);
    this.triangles.push(superTriangle);

    this.steps.push({
      description: "Created super triangle containing all points",
      triangles: [...this.triangles],
      circumcircles: [this.getCircumcircle(superTriangle)],
      highlightedPoints: [],
      newPoint: null,
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "pending",
        })),
        triangles: [
          {
            triangle: superTriangle,
            index: 0,
            status: "super",
            description: "Super triangle",
          },
        ],

        eventQueue: [{ label: "Create super triangle", status: "processed" }],
        activeSet: [{ label: "Super triangle", status: "active" }],
        output: [],
      },
    });

    // Add points one by one
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];

      this.steps.push({
        description: `Adding point ${i + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`,
        triangles: [...this.triangles],
        circumcircles: this.triangles.map((t) => this.getCircumcircle(t)),
        highlightedPoints: [i],
        newPoint: point,
        algorithmStep: 1,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: j < i ? "processed" : j === i ? "current" : "pending",
          })),
          triangles: this.triangles.map((t, k) => ({
            triangle: t,
            index: k,
            status: "active",
            description:
              k === 0 && i === 0 ? "Super triangle" : `Triangle ${k + 1}`,
          })),

          eventQueue: [{ label: `Insert P${i + 1}`, status: "current", point }],
          activeSet: this.triangles.map((t, k) => ({
            label: `Tri ${k + 1}`,
            status: "active",
          })),
          output: [],
        },
      });

      // Find triangles whose circumcircle contains the new point
      const badTriangles = [];
      for (let j = 0; j < this.triangles.length; j++) {
        const triangle = this.triangles[j];
        const circumcircle = this.getCircumcircle(triangle);
        if (this.pointInCircumcircle(point, circumcircle)) {
          badTriangles.push(j);
        }
      }

      this.steps.push({
        description: `Found ${badTriangles.length} triangles with circumcircles containing the new point`,
        triangles: [...this.triangles],
        circumcircles: this.triangles.map((t) => this.getCircumcircle(t)),
        highlightedPoints: [i],
        newPoint: point,
        badTriangles: badTriangles,
        algorithmStep: 2,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: j < i ? "processed" : j === i ? "current" : "pending",
          })),
          triangles: this.triangles.map((t, k) => ({
            triangle: t,
            index: k,
            status: badTriangles.includes(k) ? "rejected" : "active",
            description: badTriangles.includes(k)
              ? `Triangle ${k + 1} (to be removed)`
              : `Triangle ${k + 1}`,
          })),

          eventQueue: [
            { label: `Find bad triangles for P${i + 1}`, status: "processed" },
          ],
          activeSet: badTriangles.map((k) => ({
            label: `Bad Tri ${k + 1}`,
            status: "active",
          })),
          output: [],
        },
      });

      // Find the boundary of the polygonal hole
      const polygon = this.getPolygonalHole(badTriangles);

      // Remove bad triangles
      const removedTriangles = [];
      for (let j = badTriangles.length - 1; j >= 0; j--) {
        removedTriangles.push(this.triangles[badTriangles[j]]);
        this.triangles.splice(badTriangles[j], 1);
      }

      // Create new triangles by connecting the point to the polygon boundary
      const newTriangles = [];
      for (let j = 0; j < polygon.length; j++) {
        const edge = polygon[j];
        const newTriangle = [point, edge[0], edge[1]];
        this.triangles.push(newTriangle);
        newTriangles.push(newTriangle);
      }

      this.steps.push({
        description: `Created ${polygon.length} new triangles. Total: ${this.triangles.length}`,
        triangles: [...this.triangles],
        circumcircles: this.triangles.map((t) => this.getCircumcircle(t)),
        highlightedPoints: [i],
        newPoint: null,
        algorithmStep: 3,
        eventSets: {
          points: this.points.map((p, j) => ({
            point: p,
            index: j,
            status: j <= i ? "processed" : "pending",
          })),
          triangles: [
            ...this.triangles.slice(0, -newTriangles.length).map((t, k) => ({
              triangle: t,
              index: k,
              status: "active",
              description: `Triangle ${k + 1}`,
            })),
            ...newTriangles.map((t, k) => ({
              triangle: t,
              index: this.triangles.length - newTriangles.length + k,
              status: "accepted",
              description: `New triangle ${k + 1}`,
            })),
          ],

          eventQueue: [{ label: `Re-triangulate hole`, status: "processed" }],
          activeSet: newTriangles.map((t, k) => ({
            label: `New Tri ${k + 1}`,
            status: "active",
          })),
          output: [{ label: `Tri +${newTriangles.length}`, status: "new" }],
        },
      });
    }

    // Remove triangles that share vertices with the super triangle
    const superVertices = superTriangle;
    const finalTriangles = this.triangles.filter((triangle) => {
      return !triangle.some((vertex) =>
        superVertices.some(
          (superVertex) =>
            Math.abs(vertex.x - superVertex.x) < 1e-9 &&
            Math.abs(vertex.y - superVertex.y) < 1e-9
        )
      );
    });

    const removedSuperTriangles = this.triangles.filter((triangle) => {
      return triangle.some((vertex) =>
        superVertices.some(
          (superVertex) =>
            Math.abs(vertex.x - superVertex.x) < 1e-9 &&
            Math.abs(vertex.y - superVertex.y) < 1e-9
        )
      );
    });

    this.triangles = finalTriangles;

    this.steps.push({
      description: `Removed super triangle. Final triangulation has ${this.triangles.length} triangles`,
      triangles: [...this.triangles],
      circumcircles: this.triangles.map((t) => this.getCircumcircle(t)),
      highlightedPoints: [],
      newPoint: null,
      algorithmStep: 4,
      eventSets: {
        points: this.points.map((p, j) => ({
          point: p,
          index: j,
          status: "processed",
        })),
        triangles: [
          ...this.triangles.map((t, k) => ({
            triangle: t,
            index: k,
            status: "accepted",
            description: `Final triangle ${k + 1}`,
          })),
          ...removedSuperTriangles.map((t, k) => ({
            triangle: t,
            index: `super-${k}`,
            status: "rejected",
            description: `Removed super triangle ${k + 1}`,
          })),
        ],

        eventQueue: [],
        activeSet: this.triangles.map((t, k) => ({
          label: `Final Tri ${k + 1}`,
          status: "active",
        })),
        output: [
          {
            label: `Final triangles: ${this.triangles.length}`,
            status: "completed",
          },
        ],
      },
    });
  }

  getBounds() {
    if (this.points.length === 0)
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

    let minX = this.points[0].x,
      maxX = this.points[0].x;
    let minY = this.points[0].y,
      maxY = this.points[0].y;

    for (const point of this.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return { minX, maxX, minY, maxY };
  }

  createSuperTriangle(bounds) {
    const dx = bounds.maxX - bounds.minX;
    const dy = bounds.maxY - bounds.minY;
    const deltaMax = Math.max(dx, dy);
    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;

    return [
      new Point(midX - 20 * deltaMax, midY - deltaMax),
      new Point(midX, midY + 20 * deltaMax),
      new Point(midX + 20 * deltaMax, midY - deltaMax),
    ];
  }

  getCircumcircle(triangle) {
    const [a, b, c] = triangle;
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

    if (Math.abs(d) < 1e-10) return null;

    const ux =
      ((a.x * a.x + a.y * a.y) * (b.y - c.y) +
        (b.x * b.x + b.y * b.y) * (c.y - a.y) +
        (c.x * c.x + c.y * c.y) * (a.y - b.y)) /
      d;
    const uy =
      ((a.x * a.x + a.y * a.y) * (c.x - b.x) +
        (b.x * b.x + b.y * b.y) * (a.x - c.x) +
        (c.x * c.x + c.y * c.y) * (b.x - a.x)) /
      d;

    const center = new Point(ux, uy);
    const radius = Point.distance(center, a);

    return { center, radius };
  }

  pointInCircumcircle(point, circumcircle) {
    if (!circumcircle) return false;
    return (
      Point.distance(point, circumcircle.center) < circumcircle.radius + 1e-10
    );
  }

  getPolygonalHole(badTriangleIndices) {
    const edges = [];

    // Collect all edges from bad triangles
    for (const index of badTriangleIndices) {
      const triangle = this.triangles[index];
      edges.push([triangle[0], triangle[1]]);
      edges.push([triangle[1], triangle[2]]);
      edges.push([triangle[2], triangle[0]]);
    }

    // Find boundary edges (edges that appear only once)
    const boundary = [];
    for (let i = 0; i < edges.length; i++) {
      let count = 0;
      for (let j = 0; j < edges.length; j++) {
        if (i !== j && this.edgesEqual(edges[i], edges[j])) {
          count++;
        }
      }
      if (count === 0) {
        boundary.push(edges[i]);
      }
    }

    return boundary;
  }

  edgesEqual(edge1, edge2) {
    return (
      (edge1[0].equals(edge2[0]) && edge1[1].equals(edge2[1])) ||
      (edge1[0].equals(edge2[1]) && edge1[1].equals(edge2[0]))
    );
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.steps.length === 0) return null;

    const step = this.steps[this.currentStep] || this.steps[0];
    step.showDuality = this.showDuality;
    return step;
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

  toggleDuality() {
    this.showDuality = !this.showDuality;
  }
}
