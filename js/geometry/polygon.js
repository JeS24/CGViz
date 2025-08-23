class Polygon {
  constructor(vertices = []) {
    this.vertices = vertices; // Array of {x, y} points
    this.edges = [];
    this.isComplete = false;
    this.updateEdges();
  }

  addVertex(x, y) {
    this.vertices.push({ x, y });
    this.updateEdges();
  }

  complete() {
    if (this.vertices.length >= 3) {
      this.isComplete = true;
      this.updateEdges();
    }
  }

  updateEdges() {
    this.edges = [];
    for (let i = 0; i < this.vertices.length; i++) {
      const next = this.isComplete ? (i + 1) % this.vertices.length : i + 1;
      if (next < this.vertices.length) {
        this.edges.push({
          start: this.vertices[i],
          end: this.vertices[next],
        });
      }
    }
  }

  // Return a deep-ish clone (new points objects), preserving completion state
  clone() {
    const copy = new Polygon(this.vertices.map((v) => ({ x: v.x, y: v.y })));
    copy.isComplete = this.isComplete;
    copy.updateEdges();
    return copy;
  }

  // Check if a point is inside the polygon using ray-casting
  containsPoint(x, y) {
    if (!this.isComplete || this.vertices.length < 3) return false;

    let inside = false;
    for (
      let i = 0, j = this.vertices.length - 1;
      i < this.vertices.length;
      j = i++
    ) {
      const xi = this.vertices[i].x,
        yi = this.vertices[i].y;
      const xj = this.vertices[j].x,
        yj = this.vertices[j].y;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Signed area (+ve for CCW, -ve for CW)
  signedAreaOf(vertices = this.vertices) {
    if (vertices.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      sum += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    return sum / 2;
  }

  isCCW(vertices = this.vertices) {
    return this.signedAreaOf(vertices) > 0;
  }

  // Check if two points can see each other (no polygon edges block the line of sight)
  canSee(p1, p2) {
    if (!this.isComplete) return true;

    // Check if the line segment (p1 - p2) intersects any polygon edge
    for (let edge of this.edges) {
      if (this.segmentsIntersect(p1, p2, edge.start, edge.end)) {
        // Allow intersection at endpoints
        if (
          !this.pointsEqual(p1, edge.start) &&
          !this.pointsEqual(p1, edge.end) &&
          !this.pointsEqual(p2, edge.start) &&
          !this.pointsEqual(p2, edge.end)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  // Check if two line segments intersect
  segmentsIntersect(p1, q1, p2, q2) {
    const o1 = this.orientation(p1, q1, p2);
    const o2 = this.orientation(p1, q1, q2);
    const o3 = this.orientation(p2, q2, p1);
    const o4 = this.orientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special cases for collinear points
    if (o1 === 0 && this.onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && this.onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && this.onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && this.onSegment(p2, q1, q2)) return true;

    return false;
  }

  // Find any intersections between non-adjacent edges
  // Returns list of objects: {aIndex, bIndex, point: {x,y}}
  getSelfIntersections() {
    const intersections = [];
    const n = this.vertices.length;
    if (!this.isComplete || n < 4) return intersections;

    // Build edges array, if not present
    const edges = this.edges;

    for (let i = 0; i < edges.length; i++) {
      const e1 = edges[i];
      for (let j = i + 1; j < edges.length; j++) {
        // Skip adjacent edges (sharing a vertex)
        if (
          j === i ||
          j === (i + 1) % edges.length ||
          i === (j + 1) % edges.length
        )
          continue;

        const e2 = edges[j];
        if (this.segmentsIntersect(e1.start, e1.end, e2.start, e2.end)) {
          // Compute intersection point (line-line intersection)
          const p = this._segmentIntersectionPoint(
            e1.start,
            e1.end,
            e2.start,
            e2.end
          );
          intersections.push({ aIndex: i, bIndex: j, point: p });
        }
      }
    }
    return intersections;
  }

  // Return true if polygon is simple (no self-intersections)
  isSimple() {
    const ints = this.getSelfIntersections();
    return ints.length === 0;
  }

  // Helper: compute intersection point of two line segments (NOTE: assumes they intersect)
  _segmentIntersectionPoint(p1, p2, p3, p4) {
    // Line AB represented as p1 + r*(p2-p1)
    const x1 = p1.x,
      y1 = p1.y;
    const x2 = p2.x,
      y2 = p2.y;
    const x3 = p3.x,
      y3 = p3.y;
    const x4 = p4.x,
      y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    const EPS = 1e-9;
    if (Math.abs(denom) < EPS) {
      // Parallel or nearly-parallel: check for collinear overlapping segments
      // If not collinear, no intersection point
      if (
        this.orientation(p1, p2, p3) !== 0 ||
        this.orientation(p1, p2, p4) !== 0
      )
        return null;

      // Project onto the dominant axis to find overlap interval
      const dx = Math.abs(x1 - x2);
      const dy = Math.abs(y1 - y2);

      let sorted;
      if (dx >= dy) {
        // Sort by x
        sorted = [p1, p2, p3, p4].slice().sort((a, b) => a.x - b.x);
        const a = sorted[1];
        const b = sorted[2];
        // Check if intervals overlap (allow touching)
        if (a.x <= b.x + EPS) {
          return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }
        return null;
      } else {
        // Sort by y
        sorted = [p1, p2, p3, p4].slice().sort((a, b) => a.y - b.y);
        const a = sorted[1];
        const b = sorted[2];
        if (a.y <= b.y + EPS) {
          return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }
        return null;
      }
    }

    const px =
      ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
      denom;
    const py =
      ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
      denom;
    return { x: px, y: py };
  }

  // Find orientation of ordered triplet (p, q, r)
  orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // collinear
    return val > 0 ? 1 : 2; // clockwise or counterclockwise
  }

  // Check if point q lies on segment pr
  onSegment(p, q, r) {
    return (
      q.x <= Math.max(p.x, r.x) &&
      q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) &&
      q.y >= Math.min(p.y, r.y)
    );
  }

  pointsEqual(p1, p2, tolerance = 1e-6) {
    return (
      Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
    );
  }

  // Calculate the area of the polygon
  area() {
    if (!this.isComplete || this.vertices.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      const j = (i + 1) % this.vertices.length;
      area += this.vertices[i].x * this.vertices[j].y;
      area -= this.vertices[j].x * this.vertices[i].y;
    }
    return Math.abs(area) / 2;
  }

  // Polygon centroid
  centroid() {
    if (this.vertices.length === 0) return { x: 0, y: 0 };

    let cx = 0,
      cy = 0;
    for (let vertex of this.vertices) {
      cx += vertex.x;
      cy += vertex.y;
    }
    return {
      x: cx / this.vertices.length,
      y: cy / this.vertices.length,
    };
  }

  // Create a triangulation of the polygon (via simple ear clipping)
  triangulate() {
    if (!this.isComplete || this.vertices.length < 3) return [];

    const vertices = [...this.vertices];
    const triangles = [];

    while (vertices.length > 3) {
      let earFound = false;

      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];

        if (this.isEar(prev, curr, next, vertices)) {
          triangles.push([prev, curr, next]);
          vertices.splice(i, 1);
          earFound = true;
          break;
        }
      }

      if (!earFound) break; // Prevent infinite loop
    }

    if (vertices.length === 3) {
      triangles.push(vertices);
    }

    return triangles;
  }

  // Check if a vertex triple forms an ear given a vertex list
  isEar(prev, curr, next, vertices) {
    // Determine polygon winding for the provided vertex list
    const ccw = this.isCCW(vertices);
    const orient = this.orientation(prev, curr, next);
    // Convex corner must match the overall winding
    if (ccw ? orient !== 2 : orient !== 1) return false;

    // Check if any other vertex is inside the triangle
    for (let vertex of vertices) {
      if (vertex === prev || vertex === curr || vertex === next) continue;
      if (this.pointInTriangle(vertex, prev, curr, next)) return false;
    }

    return true;
  }

  // Convenience: check if vertex at index i is an ear with respect to this polygon
  isEarAt(i) {
    const n = this.vertices.length;
    if (n < 3) return false;
    const prev = this.vertices[(i - 1 + n) % n];
    const curr = this.vertices[i];
    const next = this.vertices[(i + 1) % n];
    return this.isEar(prev, curr, next, this.vertices);
  }

  // Check if a point is inside a triangle
  pointInTriangle(p, a, b, c) {
    const o1 = this.orientation(a, b, p);
    const o2 = this.orientation(b, c, p);
    const o3 = this.orientation(c, a, p);
    // Strictly inside: all same orientation and none collinear
    return o1 === o2 && o2 === o3 && o1 !== 0;
  }
}
