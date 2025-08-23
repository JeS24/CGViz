class DualLine {
  constructor(slope, intercept) {
    this.slope = slope;
    this.intercept = intercept;
  }

  // Create line from two points
  static fromPoints(p1, p2) {
    // Vertical line - handle separately or use very large slope
    if (Math.abs(p2.x - p1.x) < 0.001) {
      return new DualLine(1000, p1.x * -1000);
    }

    const slope = (p2.y - p1.y) / (p2.x - p1.x);
    const intercept = p1.y - slope * p1.x;
    return new DualLine(slope, intercept);
  }

  // Solve for y, given x
  getY(x) {
    return this.slope * x + this.intercept;
  }

  // Solve for x, given y (iff not vertical)
  getX(y) {
    if (Math.abs(this.slope) < 0.001) {
      return null; // Horizontal line
    }
    return (y - this.intercept) / this.slope;
  }

  // Check if point is on the line (within tolerance)
  containsPoint(point, tolerance = 1) {
    const expectedY = this.getY(point.x);
    return Math.abs(point.y - expectedY) < tolerance;
  }

  toString() {
    if (this.intercept >= 0) {
      return `y = ${this.slope.toFixed(2)}x + ${this.intercept.toFixed(2)}`;
    } else {
      return `y = ${this.slope.toFixed(2)}x - ${Math.abs(
        this.intercept
      ).toFixed(2)}`;
    }
  }

  equals(other, tolerance = 0.1) {
    return (
      Math.abs(this.slope - other.slope) < tolerance &&
      Math.abs(this.intercept - other.intercept) < tolerance
    );
  }
}
