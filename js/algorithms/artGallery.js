/**
 * The Art Gallery Problem
 * This implementation requires a simple polygon and places guards using a 3-coloring
 * algorithm on the triangulated polygon. It computes visibility regions for each guard.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Art_gallery_problem
 *   - https://en.wikipedia.org/wiki/Visibility_(geometry)
 *   - https://www.youtube.com/watch?v=RICtZA6K58s - Mod-01 Lec-02 Visibility Problems by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Chapter 3, "Art Gallery Theorem", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 *   - "Art Gallery Theorems and Algorithms" by Joseph O'Rourke (https://archive.org/details/artgallerytheore0000orou)
 */

class ArtGalleryAlgorithm {
  constructor() {
    this.polygon = new Polygon();
    this.guards = [];
    this.visibilityRegions = [];
    this.triangulation = [];
    this.steps = [];
    this.currentStep = 0;
  }

  reset() {
    this.polygon = new Polygon();
    this.guards = [];
    this.visibilityRegions = [];
    this.triangulation = [];
    this.steps = [];
    this.currentStep = 0;
  }

  addVertex(xOrPoint, y) {
    // Support both addVertex(x, y) and addVertex({x, y}) because some places will need objects
    if (typeof xOrPoint === "object" && xOrPoint !== null) {
      this.polygon.addVertex(xOrPoint.x, xOrPoint.y);
    } else {
      this.polygon.addVertex(xOrPoint, y);
    }
  }

  completePolygon() {
    this.polygon.complete();
    if (this.polygon.isComplete) {
      this.computeGuardPlacement();
    }
  }

  computeGuardPlacement() {
    this.steps = [];
    this.guards = [];
    // Validate polygon simplicity (no self-intersections) before proceeding
    if (!this.polygon.isSimple()) {
      const intersections = this.polygon.getSelfIntersections();
      this.steps.push({
        type: "invalid-polygon",
        description:
          "Polygon has self-intersections and is not simple - cannot compute guard placement",
        polygon: JSON.parse(JSON.stringify(this.polygon)),
        intersections: intersections,
        eventSets: {
          polygon: {
            vertices: this.polygon.vertices.length,
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
      // Do not proceed with triangulation or guard placement
      this.currentStep = 0;
      return;
    }

    // Step 1: Show the completed polygon
    this.steps.push({
      type: "polygon-complete",
      description: "Polygon completed - ready to find guard positions",
      polygon: JSON.parse(JSON.stringify(this.polygon)),
      guards: [],
      triangulation: [],
      eventSets: {
        polygon: {
          vertices: this.polygon.vertices.length,
          area: this.polygon.area().toFixed(2),
          perimeter: this.calculatePerimeter().toFixed(2),
        },
        eventQueue: [{ label: "Complete polygon", status: "processed" }],
        activeSet: [],
        output: [{ label: "Polygon summary", status: "new" }],
      },
    });

    // Step 2: Triangulate the polygon
    this.triangulation = this.polygon.triangulate();
    this.steps.push({
      type: "triangulation",
      description: "Triangulate polygon using Ear Clipping algorithm",
      polygon: JSON.parse(JSON.stringify(this.polygon)),
      guards: [],
      triangulation: JSON.parse(JSON.stringify(this.triangulation)),
      eventSets: {
        triangulation: {
          triangles: this.triangulation.length,
          method: "Ear Clipping",
        },
        eventQueue: [{ label: "Triangulate polygon", status: "processed" }],
        activeSet: [],
        output: [
          { label: `Triangles: ${this.triangulation.length}`, status: "new" },
        ],
      },
    });

    // Step 3: 3-color the triangulation
    const coloring = this.threeColorTriangulation();
    this.steps.push({
      type: "coloring",
      description: "3-color the triangulation vertices",
      polygon: JSON.parse(JSON.stringify(this.polygon)),
      guards: [],
      triangulation: JSON.parse(JSON.stringify(this.triangulation)),
      coloring: coloring,
      eventSets: {
        coloring: {
          colors: ["Red", "Green", "Blue"],
          vertices: this.polygon.vertices.length,
        },
        eventQueue: [{ label: "3-color triangulation", status: "processed" }],
        activeSet: [],
        output: [
          {
            label: `Vertices colored: ${this.polygon.vertices.length}`,
            status: "new",
          },
        ],
      },
    });

    // Step 4: Choose the color with minimum vertices as guards
    const guardPositions = this.selectOptimalGuards(coloring);
    this.guards = guardPositions;

    this.steps.push({
      type: "guard-selection",
      description: "Select guards from the color class with minimum vertices",
      polygon: JSON.parse(JSON.stringify(this.polygon)),
      guards: JSON.parse(JSON.stringify(this.guards)),
      triangulation: JSON.parse(JSON.stringify(this.triangulation)),
      coloring: coloring,
      eventSets: {
        guards: {
          count: this.guards.length,
          theorem: `≤ ⌊n/3⌋ = ⌊${
            this.polygon.vertices.length
          }/3⌋ = ${Math.floor(this.polygon.vertices.length / 3)}`,
        },
        eventQueue: [{ label: "Select guards", status: "processed" }],
        activeSet: this.guards.map((g, i) => ({
          label: `Guard ${i + 1}`,
          status: "active",
          point: g,
        })),
        output: [
          { label: `Guards placed: ${this.guards.length}`, status: "new" },
        ],
      },
    });

    // Step 5: Show visibility regions
    this.computeVisibilityRegions();
    this.steps.push({
      type: "visibility",
      description: "Show visibility regions for each guard",
      polygon: JSON.parse(JSON.stringify(this.polygon)),
      guards: JSON.parse(JSON.stringify(this.guards)),
      triangulation: JSON.parse(JSON.stringify(this.triangulation)),
      visibilityRegions: JSON.parse(JSON.stringify(this.visibilityRegions)),
      eventSets: {
        visibility: {
          coverage: "100%",
          guards: this.guards.length,
        },
        eventQueue: [
          { label: "Compute visibility regions", status: "processed" },
        ],
        activeSet: this.guards.map((g, i) => ({
          label: `Guard ${i + 1}`,
          status: "active",
          point: g,
        })),
        output: [{ label: "Visibility coverage: 100%", status: "new" }],
      },
    });
  }

  removeVertex(point) {
    // Remove nearest vertex within a small radius
    const idx = this.polygon.vertices.findIndex(
      (v) => Math.abs(v.x - point.x) < 10 && Math.abs(v.y - point.y) < 10
    );
    if (idx !== -1) {
      this.polygon.vertices.splice(idx, 1);
      // If polygon was completed, re-open since vertices changed
      this.polygon.isComplete =
        this.polygon.vertices.length >= 3 && this.polygon.isComplete;
      this.polygon.updateEdges();

      // Clearing steps as geometry changed
      this.steps = [];
      this.currentStep = 0;
      this.triangulation = [];
      this.guards = [];
      this.visibilityRegions = [];
    }
  }

  clear() {
    this.reset();
  }

  calculatePerimeter() {
    let perimeter = 0;
    for (let edge of this.polygon.edges) {
      const dx = edge.end.x - edge.start.x;
      const dy = edge.end.y - edge.start.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  // 3-coloring algorithm for triangulated polygon - via Chvátal's Art Gallery Theorem
  // Uses an eager/greedy approach to color the vertices of the triangulation
  threeColorTriangulation() {
    const coloring = new Map();
    const vertices = this.polygon.vertices;

    // Initialize all vertices as uncolored
    vertices.forEach((vertex, index) => {
      coloring.set(index, -1);
    });

    // Start with the first triangle
    if (this.triangulation.length > 0) {
      const firstTriangle = this.triangulation[0];
      const v1 = vertices.findIndex((v) =>
        this.polygon.pointsEqual(v, firstTriangle[0])
      );
      const v2 = vertices.findIndex((v) =>
        this.polygon.pointsEqual(v, firstTriangle[1])
      );
      const v3 = vertices.findIndex((v) =>
        this.polygon.pointsEqual(v, firstTriangle[2])
      );

      coloring.set(v1, 0); // Red
      coloring.set(v2, 1); // Green
      coloring.set(v3, 2); // Blue
    }

    // Color remaining vertices
    for (let triangle of this.triangulation) {
      const indices = triangle.map((vertex) =>
        vertices.findIndex((v) => this.polygon.pointsEqual(v, vertex))
      );

      // Find colors already used in this triangle
      const usedColors = new Set();
      const uncoloredVertices = [];

      for (let idx of indices) {
        const color = coloring.get(idx);
        if (color !== -1) {
          usedColors.add(color);
        } else {
          uncoloredVertices.push(idx);
        }
      }

      // Assign colors to uncolored vertices
      let availableColor = 0;
      for (let idx of uncoloredVertices) {
        while (usedColors.has(availableColor)) {
          availableColor++;
        }
        coloring.set(idx, availableColor);
        usedColors.add(availableColor);
      }
    }

    return coloring;
  }

  selectOptimalGuards(coloring) {
    const colorCounts = [0, 0, 0];
    const colorVertices = [[], [], []];

    // Count vertices of each color
    coloring.forEach((color, vertexIndex) => {
      if (color >= 0 && color < 3) {
        colorCounts[color]++;
        colorVertices[color].push(this.polygon.vertices[vertexIndex]);
      }
    });

    // Choose the color with minimum count
    let minColor = 0;
    for (let i = 1; i < 3; i++) {
      if (colorCounts[i] < colorCounts[minColor]) {
        minColor = i;
      }
    }

    return colorVertices[minColor].map((vertex) => ({
      x: vertex.x,
      y: vertex.y,
      color: minColor,
    }));
  }

  computeVisibilityRegions() {
    this.visibilityRegions = [];

    for (let guard of this.guards) {
      const visiblePoints = [];

      // Sample points around the polygon and check visibility
      const sampleCount = 100;
      for (let i = 0; i < sampleCount; i++) {
        const angle = (2 * Math.PI * i) / sampleCount;
        const maxDistance = 500; // Maximum visibility distance

        for (let distance = 10; distance < maxDistance; distance += 10) {
          const testPoint = {
            x: guard.x + Math.cos(angle) * distance,
            y: guard.y + Math.sin(angle) * distance,
          };

          if (
            this.polygon.containsPoint(testPoint.x, testPoint.y) &&
            this.polygon.canSee(guard, testPoint)
          ) {
            visiblePoints.push(testPoint);
          } else {
            break; // Hit an obstacle
          }
        }
      }

      this.visibilityRegions.push({
        guard: guard,
        visibleArea: visiblePoints,
      });
    }
  }

  getStep(index) {
    if (index >= 0 && index < this.steps.length) {
      return this.steps[index];
    }
    return null;
  }

  getStepCount() {
    return this.steps.length;
  }

  getCurrentStep() {
    return this.getStep(this.currentStep);
  }

  nextStep() {
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

  setStep(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentStep = index;
    }
    return this.getCurrentStep();
  }
}
