class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  static distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  static polarAngle(center, point) {
    return Math.atan2(point.y - center.y, point.x - center.x);
  }

  static crossProduct(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  static orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // 0: collinear
    return val > 0 ? 1 : 2; // 1: clockwise or 2: counterclockwise
  }

  equals(other) {
    return (
      Math.abs(this.x - other.x) < 1e-9 && Math.abs(this.y - other.y) < 1e-9
    );
  }

  clone() {
    return new Point(this.x, this.y);
  }
}
