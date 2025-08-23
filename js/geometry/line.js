class LineSegment {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }

  static doIntersect(seg1, seg2) {
    const o1 = Point.orientation(seg1.p1, seg1.p2, seg2.p1);
    const o2 = Point.orientation(seg1.p1, seg1.p2, seg2.p2);
    const o3 = Point.orientation(seg2.p1, seg2.p2, seg1.p1);
    const o4 = Point.orientation(seg2.p1, seg2.p2, seg1.p2);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Handle special cases: collinearity
    if (o1 === 0 && LineSegment.onSegment(seg1.p1, seg2.p1, seg1.p2))
      return true;
    if (o2 === 0 && LineSegment.onSegment(seg1.p1, seg2.p2, seg1.p2))
      return true;
    if (o3 === 0 && LineSegment.onSegment(seg2.p1, seg1.p1, seg2.p2))
      return true;
    if (o4 === 0 && LineSegment.onSegment(seg2.p1, seg1.p2, seg2.p2))
      return true;

    return false;
  }

  static onSegment(p, q, r) {
    return (
      q.x <= Math.max(p.x, r.x) &&
      q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) &&
      q.y >= Math.min(p.y, r.y)
    );
  }

  static intersection(seg1, seg2) {
    const x1 = seg1.p1.x,
      y1 = seg1.p1.y;
    const x2 = seg1.p2.x,
      y2 = seg1.p2.y;
    const x3 = seg2.p1.x,
      y3 = seg2.p1.y;
    const x4 = seg2.p2.x,
      y4 = seg2.p2.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return new Point(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
    }
    return null;
  }

  length() {
    return Point.distance(this.p1, this.p2);
  }

  midpoint() {
    return new Point((this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2);
  }
}
