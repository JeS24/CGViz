/**
 * Voronoi Diagram - via Delaunay Triangulation
 * Voronoi diagrams partition space into regions based on proximity to sites.
 * Each cell contains all points closest to its site. This class implements Voronoi diagram
 * construction using the dual of Delaunay triangulation.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Voronoi_diagram
 *   - https://en.wikipedia.org/wiki/Delaunay_triangulation
 *   - https://www.youtube.com/watch?v=Yf01YxCotfU - Mod-08 Lec-17 Voronoi Diagram: Properties by Dr. Pankaj Agarwal, NPTEL Course on Computational Geometry
 *   - https://www.youtube.com/watch?v=EFg7avIoSv8 - Mod-08 Lec-18 Voronoi Diagram Construction by Dr. Pankaj Agarwal, NPTEL Course on Computational Geometry
 *   - https://www.youtube.com/watch?v=IqdSdbxrTsY - Mod-08 Lec-19 Delaunay Triangulation by Dr. Sandeep Sen, NPTEL Course on Computational Geometry
 *   - Section 8.4 of "Computational Geometry & Computer Graphics in C++" by Michael J. Laszlo
 */

class VoronoiAlgorithm {
  constructor() {
    this.points = [];
    this.steps = [];
    this.currentStep = 0;
    this.voronoiCells = [];
    this.delaunayTriangulation = [];
    this.algorithmStep = 0;
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
    this.voronoiCells = [];
    this.delaunayTriangulation = [];
    this.algorithmStep = 0;
  }

  clear() {
    this.points = [];
    this.reset();
  }

  toggleDuality() {
    this.showDuality = !this.showDuality;
  }

  computeSteps() {
    if (this.points.length < 3) {
      this.steps = [
        {
          description: "Need at least 3 points for Voronoi diagram",
          voronoiCells: [],
          delaunayTriangulation: [],
          points: [...this.points],
          highlightedPoints: [],
          showDuality: this.showDuality,
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

    // Step 0: Introduction
    this.steps.push({
      description:
        "Voronoi diagram divides space into regions of closest site (we build it via Delaunay)",
      voronoiCells: [],
      delaunayTriangulation: [],
      points: [...this.points],
      highlightedPoints: [],
      showDuality: this.showDuality,
      algorithmStep: 0,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "pending",
        })),
        eventQueue: [
          { label: "Run Delaunay (incremental)", status: "pending" },
        ],
        activeSet: [],
        output: [],
      },
    });

    // Run Delaunay and splice its incremental steps into our storyline
    const delaunay = new DelaunayBowyerWatson();
    this.points.forEach((point) => delaunay.addPoint(point));
    delaunay.computeSteps();

    // Mirror Delaunay steps so user sees points being processed
    for (let s = 0; s < delaunay.steps.length; s++) {
      const ds = delaunay.steps[s];
      this.steps.push({
        description: `Delaunay: ${ds.description}`,
        voronoiCells: [],
        delaunayTriangulation: ds.triangles ? [...ds.triangles] : [],
        points: [...this.points],
        highlightedPoints: ds.highlightedPoints
          ? [...ds.highlightedPoints]
          : [],
        showDuality: this.showDuality,
        algorithmStep: 1,
        eventSets: ds.eventSets
          ? JSON.parse(JSON.stringify(ds.eventSets))
          : undefined,
        // For context when we later draw circumcenters over the final mesh
        circumcenters: ds.circumcircles
          ? ds.circumcircles.filter(Boolean).map((c) => c.center)
          : [],
      });
    }

    // Final triangulation from Delaunay
    const finalStep = delaunay.steps[delaunay.steps.length - 1];
    this.delaunayTriangulation = [...finalStep.triangles];

    // Step 2: Compute circumcenters for each Delaunay triangle
    const circumcenters = this.delaunayTriangulation.map((triangle) =>
      this.getCircumcenter(triangle)
    );

    this.steps.push({
      description:
        "Step 2: Calculate circumcenters of Delaunay triangles - these will become Voronoi vertices",
      voronoiCells: [],
      delaunayTriangulation: [...this.delaunayTriangulation],
      circumcenters: [...circumcenters],
      points: [...this.points],
      highlightedPoints: [],
      showDuality: this.showDuality,
      algorithmStep: 2,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "processed",
        })),
        circumcenters: circumcenters.map((c, i) => ({
          point: c,
          index: i,
          status: "current",
        })),

        eventQueue: [{ label: "Group triangles by site", status: "pending" }],
        activeSet: circumcenters.map((c, i) => ({
          label: `Vc${i + 1}`,
          status: "active",
          point: c,
        })),
        output: [],
      },
    });

    // Step 3: Identify triangles for each site (highlight sites one by one)
    for (let si = 0; si < this.points.length; si++) {
      this.steps.push({
        description: `Step 3: Identify Delaunay triangles incident to site P${
          si + 1
        }`,
        voronoiCells: [],
        delaunayTriangulation: [...this.delaunayTriangulation],
        circumcenters: [...circumcenters],
        points: [...this.points],
        highlightedPoints: [si],
        showDuality: this.showDuality,
        algorithmStep: 3,
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: i < si ? "processed" : i === si ? "current" : "pending",
          })),
          circumcenters: circumcenters.map((c, i) => ({
            point: c,
            index: i,
            status: "processed",
          })),
          eventQueue: [
            {
              label: "Sort circumcenters per site",
              status: si === this.points.length - 1 ? "processed" : "current",
            },
          ],
          activeSet: [
            {
              label: `Site P${si + 1}`,
              status: "active",
              point: this.points[si],
            },
          ],
          output: [],
        },
      });
    }

    // Step 4: Build Voronoi edges progressively by connecting circumcenters of adjacent triangles
    const voronoiEdges = [];
    const sharesEdge = (t1, t2) => {
      let shared = 0;
      for (const v1 of t1) for (const v2 of t2) if (v1.equals(v2)) shared++;
      return shared === 2;
    };
    for (let i = 0; i < this.delaunayTriangulation.length; i++) {
      for (let j = i + 1; j < this.delaunayTriangulation.length; j++) {
        const t1 = this.delaunayTriangulation[i];
        const t2 = this.delaunayTriangulation[j];
        if (sharesEdge(t1, t2)) {
          const e = { a: circumcenters[i], b: circumcenters[j] };
          voronoiEdges.push(e);
        }
      }
    }
    const progressive = [];
    for (let k = 0; k < voronoiEdges.length; k++) {
      progressive.push(voronoiEdges[k]);
      this.steps.push({
        description: `Step 4: Add Voronoi edge ${k + 1}/${voronoiEdges.length}`,
        voronoiCells: [],
        delaunayTriangulation: [...this.delaunayTriangulation],
        circumcenters: [...circumcenters],
        voronoiEdges: [...progressive],
        newVoronoiEdge: voronoiEdges[k],
        points: [...this.points],
        highlightedPoints: [],
        showDuality: this.showDuality,
        algorithmStep: 4,
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: "processed",
          })),
          eventQueue: [
            {
              label: `Edges ${k + 1}/${voronoiEdges.length}`,
              status: "current",
            },
          ],
          activeSet: [],
          output: [],
        },
      });
    }

    // Step 5: Build cells site-by-site (partial polygons)
    const cellsPartial = [];
    const cellMap = new Map();
    // Map points to circumcenters list
    for (let i = 0; i < this.delaunayTriangulation.length; i++) {
      const tri = this.delaunayTriangulation[i];
      for (const p of tri) {
        if (!cellMap.has(p)) cellMap.set(p, []);
        cellMap.get(p).push(circumcenters[i]);
      }
    }
    const sites = [...cellMap.keys()];
    for (let si = 0; si < sites.length; si++) {
      const site = sites[si];
      const verts = this.sortPointsByPolarAngle(cellMap.get(site), site);
      const partialCell = { site, vertices: verts };
      cellsPartial.push(partialCell);
      this.steps.push({
        description: `Step 5: Construct Voronoi cell for site P${
          this.points.indexOf(site) + 1
        }`,
        voronoiCells: [],
        partialCells: [...cellsPartial],
        delaunayTriangulation: [...this.delaunayTriangulation],
        circumcenters: [...circumcenters],
        points: [...this.points],
        highlightedPoints: [this.points.indexOf(site)],
        showDuality: this.showDuality,
        algorithmStep: 5,
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: i <= this.points.indexOf(site) ? "processed" : "pending",
          })),
          eventQueue: [
            { label: `Cell ${si + 1}/${sites.length}`, status: "current" },
          ],
          activeSet: [
            {
              label: `Cell(P${this.points.indexOf(site) + 1})`,
              status: "active",
            },
          ],
          output: [],
        },
      });
    }

    // Step 6: Construct Voronoi cells
    this.voronoiCells = this.constructVoronoiCells(
      this.delaunayTriangulation,
      circumcenters
    );

    this.steps.push({
      description:
        "Step 6: Voronoi cells constructed - each cell contains all points closest to its site",
      voronoiCells: [...this.voronoiCells],
      delaunayTriangulation: [...this.delaunayTriangulation],
      circumcenters: [...circumcenters],
      points: [...this.points],
      highlightedPoints: [],
      showDuality: this.showDuality,
      algorithmStep: 6,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "processed",
        })),
        circumcenters: circumcenters.map((c, i) => ({
          point: c,
          index: i,
          status: "processed",
        })),
        cells: this.voronoiCells.map((cell, i) => ({
          cell: cell,
          index: i,
          status: "accepted",
        })),

        eventQueue: [],
        activeSet: this.voronoiCells.map((c, i) => ({
          label: `Cell ${i + 1}`,
          status: "active",
        })),
        output: [
          { label: `Cells: ${this.voronoiCells.length}`, status: "completed" },
        ],
      },
    });

    // Step 7: Show the duality between Voronoi and Delaunay
    this.steps.push({
      description:
        "Step 7: Voronoi diagram complete - Toggle duality to see relationship with Delaunay triangulation",
      voronoiCells: [...this.voronoiCells],
      delaunayTriangulation: [...this.delaunayTriangulation],
      circumcenters: [...circumcenters],
      points: [...this.points],
      highlightedPoints: [],
      showDuality: this.showDuality,
      algorithmStep: 7,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "processed",
        })),
        circumcenters: circumcenters.map((c, i) => ({
          point: c,
          index: i,
          status: "processed",
        })),
        cells: this.voronoiCells.map((cell, i) => ({
          cell: cell,
          index: i,
          status: "accepted",
        })),

        eventQueue: [],
        activeSet: this.voronoiCells.map((c, i) => ({
          label: `Cell ${i + 1}`,
          status: "active",
        })),
        output: [{ label: "Voronoi complete", status: "completed" }],
      },
    });
  }

  getCircumcenter(triangle) {
    const [a, b, c] = triangle;
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

    if (Math.abs(d) < 1e-10) {
      // Collinear points, return midpoint of the longest side
      const ab = Point.distance(a, b);
      const bc = Point.distance(b, c);
      const ca = Point.distance(c, a);

      if (ab >= bc && ab >= ca) {
        return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (bc >= ab && bc >= ca) {
        return new Point((b.x + c.x) / 2, (b.y + c.y) / 2);
      } else {
        return new Point((c.x + a.x) / 2, (c.y + a.y) / 2);
      }
    }

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

    return new Point(ux, uy);
  }

  constructVoronoiCells(triangulation, circumcenters) {
    const cells = [];
    const pointToCircumcenters = new Map();

    // For each point, find all triangles it belongs to
    for (let i = 0; i < triangulation.length; i++) {
      const triangle = triangulation[i];
      const circumcenter = circumcenters[i];

      for (const point of triangle) {
        if (!pointToCircumcenters.has(point)) {
          pointToCircumcenters.set(point, []);
        }
        pointToCircumcenters.get(point).push(circumcenter);
      }
    }

    // For each point, create a Voronoi cell
    for (const [point, cellCircumcenters] of pointToCircumcenters.entries()) {
      // Sort circumcenters by polar angle
      const sortedCircumcenters = this.sortPointsByPolarAngle(
        cellCircumcenters,
        point
      );
      cells.push({
        site: point,
        vertices: sortedCircumcenters,
      });
    }

    return cells;
  }

  sortPointsByPolarAngle(points, center) {
    return [...points].sort((a, b) => {
      return (
        Math.atan2(a.y - center.y, a.x - center.x) -
        Math.atan2(b.y - center.y, b.x - center.x)
      );
    });
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
}
