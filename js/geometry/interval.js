class Interval {
  constructor(start, end) {
    // Ensure start <= end
    this.start = Math.min(start, end);
    this.end = Math.max(start, end);
  }

  contains(point) {
    return point >= this.start && point <= this.end;
  }

  overlaps(other) {
    return this.start <= other.end && this.end >= other.start;
  }

  length() {
    return this.end - this.start;
  }

  toString() {
    return `[${this.start.toFixed(1)}, ${this.end.toFixed(1)}]`;
  }

  equals(other) {
    return (
      Math.abs(this.start - other.start) < 0.1 &&
      Math.abs(this.end - other.end) < 0.1
    );
  }
}
