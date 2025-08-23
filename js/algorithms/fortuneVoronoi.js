/**
 * Voronoi Diagram - Fortune's algorithm
 * Fortune's sweep-line algorithm constructs Voronoi diagrams by maintaining a "beach line"
 * of parabolic arcs, as a horizontal sweep line moves downward.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Voronoi_diagram
 *   - https://en.wikipedia.org/wiki/Fortune%27s_algorithm
 *   - "A sweepline algorithm for Voronoi diagrams" by Steven Fortune (https://link.springer.com/article/10.1007/BF01840357)
 *   - Section 7.2 of "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class FortuneVoronoiAlgorithm {
  constructor() {
    this.points = [];
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
    this.showDuality = false; // unused for Fortune visualization, kept for API symmetry
  }

  addPoint(point) {
    this.points.push(point);
    this.reset();
  }

  removePoint(point) {
    const idx = this.points.findIndex(
      (p) => Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10
    );
    if (idx !== -1) {
      this.points.splice(idx, 1);
      this.reset();
    }
  }

  clear() {
    this.points = [];
    this.reset();
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.algorithmStep = 0;
  }

  toggleDuality() {
    this.showDuality = !this.showDuality;
  }

  // Build pedagogical steps for Fortune's algorithm
  computeSteps() {
    this.steps = [];

    // Step 0: Intro
    this.steps.push({
      description:
        "Fortune's algorithm: sweep a horizontal line downward; the beach line is the envelope of parabolas",
      points: [...this.points],
      processedSites: [],
      sweepY: null,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "pending",
        })),
        eventQueue: [],
        activeSet: [],
        output: [],
      },
      algorithmStep: 0,
    });

    if (this.points.length < 2) return; // need at least 2 sites to make the beach interesting

    // Fortune processes site events by decreasing y (top to bottom in typical math coords).
    // Our canvas y increases downward, so we sort by increasing y.
    const events = this.points
      .map((p, i) => ({ type: "site", y: p.y, point: p, index: i }))
      .sort((a, b) => a.y - b.y);

    // Step 1: Initialize event queue
    this.steps.push({
      description:
        "Initialize event queue with site events (sorted by y ascending)",
      points: [...this.points],
      processedSites: [],
      sweepY: null,
      eventSets: {
        points: this.points.map((p, i) => ({
          point: p,
          index: i,
          status: "pending",
        })),
        eventQueue: events.map((ev) => ({
          label: `SITE P${ev.index + 1} @ y=${ev.y.toFixed(1)}`,
          status: "pending",
          y: ev.y,
        })),
        activeSet: [],
        output: [],
      },
      algorithmStep: 1,
    });

    const processedSites = [];
    for (let k = 0; k < events.length; k++) {
      const ev = events[k];
      // Move sweep slightly below the site (canvas y grows downward) so new arc is a proper parabola
      const sweepY = ev.y + 1.0; // pixels below site
      processedSites.push(ev.point);

      // Build event queue status for this step
      const eventQueue = events.map((e, idx) => ({
        label: `${e.type.toUpperCase()} P${e.index + 1} @ y=${e.y.toFixed(1)}`,
        status: idx < k ? "processed" : idx === k ? "current" : "pending",
        y: e.y,
      }));

      this.steps.push({
        description: `Process site P${
          ev.index + 1
        }; move sweep line to y=${sweepY.toFixed(1)} and update beach line`,
        points: [...this.points],
        processedSites: [...processedSites],
        sweepY,
        // No true circle-event handling here; focus on beach line depiction
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: processedSites.includes(p) ? "processed" : "pending",
          })),
          eventQueue,
          activeSet: processedSites.map((p, i) => ({
            label: `Site P${this.points.indexOf(p) + 1}`,
            status: "active",
            point: p,
          })),
          output: [],
        },
        algorithmStep: 2,
      });
    }

    // Finalize: compute finished Voronoi cells using dual method for correctness
    try {
      if (this.points.length >= 3) {
        // Use the project's Delaunay implementation (DelaunayBowyerWatson)
        const del = new DelaunayBowyerWatson();
        this.points.forEach((pt) => del.addPoint(pt));
        del.computeSteps();
        const finalStep = del.steps[del.steps.length - 1] || {};

        // Build Voronoi cells from Delaunay triangles (circumcenters of triangles incident to each site)
        const buildCellsFromDelaunay = () => {
          const voronoiCells = [];
          const circumcentersMap = new Map();

          const circumcenterOf = (tri) => {
            const [A, B, C] = tri;
            const D =
              2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
            if (Math.abs(D) < 1e-9) return null;
            const ux =
              ((A.x * A.x + A.y * A.y) * (B.y - C.y) +
                (B.x * B.x + B.y * B.y) * (C.y - A.y) +
                (C.x * C.x + C.y * C.y) * (A.y - B.y)) /
              D;
            const uy =
              ((A.x * A.x + A.y * A.y) * (C.x - B.x) +
                (B.x * B.x + B.y * B.y) * (A.x - C.x) +
                (C.x * C.x + C.y * C.y) * (B.x - A.x)) /
              D;
            return new Point(ux, uy);
          };

          const tris = finalStep.triangles || del.triangles || [];

          for (let i = 0; i < this.points.length; i++) {
            const site = this.points[i];
            const siteCenters = [];
            for (const t of tris) {
              if (
                t.some(
                  (p) =>
                    (p.equals && p.equals(site)) ||
                    (p.x === site.x && p.y === site.y)
                )
              ) {
                const key = t.map((p) => `${p.x},${p.y}`).join("|");
                let c = circumcentersMap.get(key);
                if (!c) {
                  c = circumcenterOf(t);
                  circumcentersMap.set(key, c);
                }
                if (c) siteCenters.push(c);
              }
            }
            // sort vertices around the site (polar angle)
            siteCenters.sort(
              (p1, p2) =>
                Math.atan2(p1.y - site.y, p1.x - site.x) -
                Math.atan2(p2.y - site.y, p2.x - site.x)
            );
            if (siteCenters.length >= 1) {
              voronoiCells.push({ site, vertices: siteCenters });
            }
          }

          return voronoiCells;
        };

        const cells = buildCellsFromDelaunay();

        this.steps.push({
          description:
            "Finalize: Voronoi diagram (built from Delaunay) with Fortune sweep visualization complete",
          points: [...this.points],
          processedSites: [...this.points],
          sweepY: Math.max(...this.points.map((p) => p.y)) + 10,
          voronoiCells: cells,
          delaunayTriangulation: finalStep.triangles
            ? [...finalStep.triangles]
            : [...del.triangles],
          eventSets: {
            points: this.points.map((p, i) => ({
              point: p,
              index: i,
              status: "processed",
            })),
            eventQueue: [],
            activeSet: [],
            output: [],
          },
          algorithmStep: 3,
        });
      }
    } catch (e) {
      // If anything goes wrong, still push a final step without cells
      this.steps.push({
        description: "Finalize Fortune sweep (could not build final cells)",
        points: [...this.points],
        processedSites: [...this.points],
        sweepY: Math.max(...this.points.map((p) => p.y)) + 10,
        eventSets: {
          points: this.points.map((p, i) => ({
            point: p,
            index: i,
            status: "processed",
          })),
          eventQueue: [],
          activeSet: [],
          output: [],
        },
        algorithmStep: 3,
      });
    }
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
    if (this.steps.length === 0) return null;
    return this.steps[Math.min(this.currentStep, this.steps.length - 1)];
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
    if (this.steps.length === 0) this.computeSteps();
    if (this.steps.length === 0) return false;
    return this.currentStep < this.steps.length - 1;
  }

  canGoPrev() {
    return this.currentStep > 0;
  }
}

// Ensure global exposure for main.js lookup in browser
if (typeof window !== "undefined") {
  window.FortuneVoronoiAlgorithm = FortuneVoronoiAlgorithm;
}
