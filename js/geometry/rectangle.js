class Rectangle {
  constructor(x1, y1, x2, y2) {
    // Ensure x1 <= x2 and y1 <= y2
    this.x1 = Math.min(x1, x2);
    this.y1 = Math.min(y1, y2);
    this.x2 = Math.max(x1, x2);
    this.y2 = Math.max(y1, y2);
  }

  // Creates rectangle from two corner points
  static fromPoints(p1, p2) {
    return new Rectangle(p1.x, p1.y, p2.x, p2.y);
  }

  get width() {
    return this.x2 - this.x1;
  }

  get height() {
    return this.y2 - this.y1;
  }

  get area() {
    return this.width * this.height;
  }

  get center() {
    return {
      x: (this.x1 + this.x2) / 2,
      y: (this.y1 + this.y2) / 2,
    };
  }

  // Containment - Check if point is inside rectangle
  contains(point) {
    return (
      point.x >= this.x1 &&
      point.x <= this.x2 &&
      point.y >= this.y1 &&
      point.y <= this.y2
    );
  }

  // Check if this rectangle intersects with another
  intersects(other) {
    return !(
      this.x2 < other.x1 ||
      other.x2 < this.x1 ||
      this.y2 < other.y1 ||
      other.y2 < this.y1
    );
  }

  // Get intersection rectangle with another rectangle
  intersection(other) {
    if (!this.intersects(other)) {
      return null;
    }

    return new Rectangle(
      Math.max(this.x1, other.x1),
      Math.max(this.y1, other.y1),
      Math.min(this.x2, other.x2),
      Math.min(this.y2, other.y2)
    );
  }

  // Check if rectangles are equal
  equals(other) {
    return (
      Math.abs(this.x1 - other.x1) < 0.1 &&
      Math.abs(this.y1 - other.y1) < 0.1 &&
      Math.abs(this.x2 - other.x2) < 0.1 &&
      Math.abs(this.y2 - other.y2) < 0.1
    );
  }

  // String representation
  toString() {
    return `Rectangle(${this.x1.toFixed(1)}, ${this.y1.toFixed(
      1
    )}, ${this.x2.toFixed(1)}, ${this.y2.toFixed(1)})`;
  }

  // Clone rectangle
  clone() {
    return new Rectangle(this.x1, this.y1, this.x2, this.y2);
  }
}
