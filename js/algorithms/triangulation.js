/**
 * Polygon Triangulation Algorithm
 * This class implements the ear clipping algorithm for triangulating a simple polygon.
 * The idea is to iteratively find ears (ear triangles) in the polygon and clip them off
 * until only a triangle remains.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Polygon_triangulation#Ear_clipping_method and see the desc there for more info on polygon triangulation.
 *   - (Not Ear Clipping. Incremental Construction) https://www.youtube.com/watch?v=aVrSr3IjpSI - Triangulation of Arbitrary Polygon by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 */

class PolygonTriangulation {
  constructor() {
    this.polygon = new Polygon();
    this.steps = [];
    this.currentStep = 0;
    this.triangles = [];
    this.algorithmStep = 0;
  }

  addVertex(xOrPoint, y) {
    // Accept addVertex(point) or addVertex(x, y)
    if (typeof xOrPoint === "object" && xOrPoint !== null) {
      this.polygon.addVertex(xOrPoint.x, xOrPoint.y);
    } else {
      this.polygon.addVertex(xOrPoint, y);
    }
    this.reset();
  }

  // Auto-complete polygon and compute steps (used by UI when starting playback)
  completePolygon() {
    this.polygon.complete();

    // Recompute steps, now that, the polygon is complete
    this.reset();
    try {
      this.computeSteps();
    } catch (e) {
      // pass - computeSteps may already be called by UI
    }
  }

  removeVertex(point) {
    const index = this.polygon.vertices.findIndex(
      (v) => Math.abs(v.x - point.x) < 10 && Math.abs(v.y - point.y) < 10
    );
    if (index !== -1) {
      // Remove vertex and ensure polygon edges are updated immediately so
      // any preview/ghost edges disappear from the canvas.
      this.polygon.vertices.splice(index, 1);
      // If polygon no longer has enough vertices, mark as not complete
      if (this.polygon.vertices.length < 3) this.polygon.isComplete = false;
      this.polygon.updateEdges();
      // Clear algorithm state, as geometry changed
      this.reset();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.triangles = [];
    this.algorithmStep = 0;
  }

  clear() {
    this.polygon = new Polygon();
    this.reset();
  }

  computeSteps() {
    if (this.polygon.vertices.length < 3) {
      this.steps = [
        {
          description: "Need at least 3 vertices for triangulation",
          polygon: this.polygon.clone(),
          triangles: [],
          highlightedVertices: [],
          currentEar: null,
          eventSets: {
            vertices: this.polygon.vertices.map((v, i) => ({
              vertex: v,
              index: i,
              status: "pending",
            })),
            triangles: [],
            eventQueue: this.polygon.vertices.map((v, i) => ({
              label: `V${i + 1} (${v.x.toFixed(1)}, ${v.y.toFixed(1)})`,
              status: "pending",
              vertex: v,
            })),
            activeSet: [],
            output: [],
          },
        },
      ];
      return;
    }

    this.steps = [];
    this.triangles = [];

    // Copy of the polygon
    const workingPolygon = this.polygon.clone();
    // If polygon isn't complete, we'll treat it as complete for validation
    workingPolygon.isComplete = true;
    workingPolygon.updateEdges();

    // Simple polygon check: abort early if non-simple
    if (
      typeof workingPolygon.isSimple === "function" &&
      !workingPolygon.isSimple()
    ) {
      const intersections =
        typeof workingPolygon.getSelfIntersections === "function"
          ? workingPolygon.getSelfIntersections()
          : [];
      this.steps.push({
        description:
          "Polygon is not simple (self-intersections detected) - triangulation is ill-defined",
        polygon: workingPolygon.clone(),
        intersections: intersections,
        eventSets: {
          polygon: {
            vertices: workingPolygon.vertices.length,
            intersections: intersections.length,
          },
          eventQueue: [{ label: "Validate polygon", status: "processed" }],
          activeSet: [],
          output: [
            {
              label: `Self-intersections detected: ${intersections.length}`,
              status: "new",
            },
          ],
        },
      });
      return;
    }

    const removedVertices = [];
    // Treat working polygon as a closed loop for ear clipping visuals
    workingPolygon.isComplete = true;
    workingPolygon.updateEdges();

    this.steps.push({
      description: `Starting ear clipping with ${workingPolygon.vertices.length} vertices`,
      polygon: workingPolygon.clone(),
      triangles: [...this.triangles],
      highlightedVertices: [],
      currentEar: null,
      algorithmStep: 0,
      eventSets: {
        vertices: this.polygon.vertices.map((v, i) => ({
          vertex: v,
          index: i,
          status: "pending",
          isEar: workingPolygon.isEarAt ? workingPolygon.isEarAt(i) : false,
        })),
        triangles: [],
        eventQueue: [{ label: "Scan for ears", status: "current" }],
        activeSet: [],
        output: [],
      },
    });

    while (workingPolygon.vertices.length > 3) {
      let earFound = false;

      // Find an ear
      for (let i = 0; i < workingPolygon.vertices.length; i++) {
        if (workingPolygon.isEarAt(i)) {
          const n = workingPolygon.vertices.length;
          const prev = workingPolygon.vertices[(i - 1 + n) % n];
          const curr = workingPolygon.vertices[i];
          const next = workingPolygon.vertices[(i + 1) % n];

          this.steps.push({
            description: `Found ear at vertex ${i}: triangle (${prev.x.toFixed(
              1
            )}, ${prev.y.toFixed(1)}) - (${curr.x.toFixed(1)}, ${curr.y.toFixed(
              1
            )}) - (${next.x.toFixed(1)}, ${next.y.toFixed(1)})`,
            polygon: workingPolygon.clone(),
            triangles: [...this.triangles],
            highlightedVertices: [(i - 1 + n) % n, i, (i + 1) % n],
            currentEar: [prev, curr, next],
            algorithmStep: 1,
            eventSets: {
              vertices: workingPolygon.vertices.map((v, j) => ({
                vertex: v,
                index: j,
                status: [(i - 1 + n) % n, i, (i + 1) % n].includes(j)
                  ? "current"
                  : "pending",
                isEar: workingPolygon.isEarAt(j),
              })),
              triangles: this.triangles.map((t, k) => ({
                triangle: t,
                index: k,
                status: "accepted",
              })),
              eventQueue: [
                { label: `Select ear at V${i + 1}`, status: "current" },
              ],
              activeSet: [
                { label: `Ear vertices`, status: "active" },
                {
                  label: `V${((i - 1 + n) % n) + 1}`,
                  status: "active",
                  vertex: prev,
                },
                { label: `V${i + 1}`, status: "active", vertex: curr },
                {
                  label: `V${((i + 1) % n) + 1}`,
                  status: "active",
                  vertex: next,
                },
              ],
              output: [],
            },
          });

          // Add triangle
          this.triangles.push([prev, curr, next]);
          removedVertices.push(curr);

          // Remove the ear vertex
          workingPolygon.vertices.splice(i, 1);

          this.steps.push({
            description: `Clipped ear, removed vertex. ${workingPolygon.vertices.length} vertices remaining`,
            polygon: (() => {
              const p = workingPolygon.clone();
              p.isComplete = true;
              p.updateEdges();
              return p;
            })(),
            triangles: [...this.triangles],
            highlightedVertices: [],
            currentEar: null,
            algorithmStep: 2,
            eventSets: {
              vertices: [
                ...workingPolygon.vertices.map((v, j) => ({
                  vertex: v,
                  index: j,
                  status: "pending",
                  isEar: workingPolygon.isEarAt(j),
                })),
                ...removedVertices.map((v, j) => ({
                  vertex: v,
                  index: `removed-${j}`,
                  status: "processed",
                })),
              ],
              triangles: this.triangles.map((t, k) => ({
                triangle: t,
                index: k,
                status:
                  k === this.triangles.length - 1 ? "current" : "accepted",
              })),
              eventQueue: [{ label: "Clip ear", status: "processed" }],
              activeSet: [],
              output: [
                { label: `Triangle #${this.triangles.length}`, status: "new" },
              ],
            },
          });

          earFound = true;
          break;
        }
      }

      if (!earFound) {
        this.steps.push({
          description: "No ear found - polygon may not be simple",
          polygon: workingPolygon.clone(),
          triangles: [...this.triangles],
          highlightedVertices: [],
          currentEar: null,
          eventSets: {
            vertices: workingPolygon.vertices.map((v, j) => ({
              vertex: v,
              index: j,
              status: "rejected",
            })),
            triangles: this.triangles.map((t, k) => ({
              triangle: t,
              index: k,
              status: "accepted",
            })),
            eventQueue: [{ label: "Scan for ears", status: "current" }],
            activeSet: [],
            output: [],
          },
        });
        break;
      }
    }

    // Add the final triangle
    if (workingPolygon.vertices.length === 3) {
      this.triangles.push([...workingPolygon.vertices]);

      this.steps.push({
        description: `Added final triangle. Triangulation complete with ${this.triangles.length} triangles`,
        polygon: workingPolygon.clone(),
        triangles: [...this.triangles],
        highlightedVertices: [0, 1, 2],
        currentEar: [...workingPolygon.vertices],
        algorithmStep: 3,
        eventSets: {
          vertices: [
            ...workingPolygon.vertices.map((v, j) => ({
              vertex: v,
              index: j,
              status: "accepted",
            })),
            ...removedVertices.map((v, j) => ({
              vertex: v,
              index: `removed-${j}`,
              status: "processed",
            })),
          ],
          triangles: this.triangles.map((t, k) => ({
            triangle: t,
            index: k,
            status: "accepted",
          })),
          eventQueue: [],
          activeSet: this.triangles.map((t, k) => ({
            label: `Triangle #${k + 1}`,
            status: "active",
          })),
          output: [
            {
              label: `Total triangles: ${this.triangles.length}`,
              status: "completed",
            },
          ],
        },
      });
    }
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
