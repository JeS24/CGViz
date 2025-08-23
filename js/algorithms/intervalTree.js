/**
 * Interval Tree Algorithm
 * Interval Tree is a binary search tree that efficiently stores intervals and supports
 * fast interval queries. Each node stores a median value and intervals that cross that median.
 * This implementation builds an Interval Tree by recursively partitioning
 * the set of intervals based on their endpoints. Main use is to allow efficient
 * querying of intervals that overlap with a given point or range, AKA
 * range-search, not implemented here though.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Interval_tree
 *   - Section 10.1, "Interval Trees", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class IntervalTreeAlgorithm {
  constructor() {
    this.intervals = [];
    this.steps = [];
    this.currentStep = 0;
    this.tree = null; // Root node
    this.algorithmStep = 0;
    this.numberLineMin = 0;
    this.numberLineMax = 100;
  }

  addInterval(interval) {
    this.intervals.push(interval);
    this.reset();
  }

  removeInterval(interval) {
    const index = this.intervals.findIndex(
      (i) =>
        Math.abs(i.start - interval.start) < 1 &&
        Math.abs(i.end - interval.end) < 1
    );
    if (index !== -1) {
      this.intervals.splice(index, 1);
      this.reset();
    }
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.tree = null;
    this.algorithmStep = 0;
  }

  clear() {
    this.intervals = [];
    this.reset();
  }

  computeSteps() {
    if (this.intervals.length === 0) {
      this.steps = [
        {
          description: "No intervals to process",
          tree: null,
          intervals: [],
          currentNode: null,
          highlightedIntervals: [],
          eventSets: {
            intervals: [],
            nodes: [],
          },
        },
      ];
      return;
    }

    this.steps = [];
    this.tree = null;

    // Step 1: Show all intervals
    this.steps.push({
      description: `Starting with ${this.intervals.length} intervals`,
      tree: null,
      intervals: [...this.intervals],
      currentNode: null,
      highlightedIntervals: [],
      algorithmStep: 0,
      eventSets: {
        intervals: this.intervals.map((interval, i) => ({
          interval: interval,
          index: i,
          status: "pending",
        })),
        nodes: [],
      },
    });

    // Build the interval tree step-by-step
    this.buildIntervalTree();
  }

  buildIntervalTree() {
    if (this.intervals.length === 0) return;

    // Step 2: Sort intervals by start point
    const sortedIntervals = [...this.intervals].sort(
      (a, b) => a.start - b.start
    );

    this.steps.push({
      description: "Sorting intervals by start point",
      tree: null,
      intervals: sortedIntervals,
      currentNode: null,
      highlightedIntervals: [],
      algorithmStep: 1,
      eventSets: {
        intervals: sortedIntervals.map((interval, i) => ({
          interval: interval,
          index: i,
          status: "sorted",
        })),
        nodes: [],

        eventQueue: sortedIntervals.map((interval, i) => ({
          label: `I${i + 1}: [${interval.start.toFixed(
            1
          )}, ${interval.end.toFixed(1)}]`,
          status: "pending",
          interval,
        })),
        activeSet: [],
        output: [],
      },
    });

    // Step 3: Find median point
    const allPoints = [];
    for (const interval of this.intervals) {
      allPoints.push(interval.start, interval.end);
    }
    allPoints.sort((a, b) => a - b);
    const median = allPoints[Math.floor(allPoints.length / 2)];

    this.steps.push({
      description: `Finding median point: ${median}`,
      tree: null,
      intervals: sortedIntervals,
      currentNode: null,
      highlightedIntervals: [],
      median: median,
      algorithmStep: 2,
      eventSets: {
        intervals: sortedIntervals.map((interval, i) => ({
          interval: interval,
          index: i,
          status: "analyzing",
        })),
        nodes: [],

        eventQueue: [
          {
            label: `Compute median of ${allPoints.length} endpoints`,
            status: "processed",
          },
        ],
        activeSet: [],
        output: [
          { label: `Median = ${median.toFixed(1)}`, status: "new", median },
        ],
      },
    });

    // Build tree recursively
    this.tree = this.buildTreeRecursive(this.intervals, 0);

    // Add final step showing completed tree
    this.steps.push({
      description: `Interval tree construction complete! Tree has ${this.countNodes(
        this.tree
      )} nodes.`,
      tree: this.copyTree(this.tree),
      intervals: this.intervals,
      currentNode: null,
      highlightedIntervals: [],
      algorithmStep: 100, // Final step
      eventSets: {
        intervals: this.intervals.map((interval, i) => ({
          interval: interval,
          index: i,
          status: "completed",
        })),
        nodes: [],
      },
    });
  }

  buildTreeRecursive(intervals, depth) {
    if (intervals.length === 0) return null;

    // Find median
    const allPoints = [];
    for (const interval of intervals) {
      allPoints.push(interval.start, interval.end);
    }
    allPoints.sort((a, b) => a - b);
    const median = allPoints[Math.floor(allPoints.length / 2)];

    // Partition intervals
    const leftIntervals = [];
    const rightIntervals = [];
    const centerIntervals = [];

    for (const interval of intervals) {
      if (interval.end < median) {
        leftIntervals.push(interval);
      } else if (interval.start > median) {
        rightIntervals.push(interval);
      } else {
        centerIntervals.push(interval);
      }
    }

    // Create node
    const node = {
      median: median,
      centerIntervals: centerIntervals,
      left: null,
      right: null,
      depth: depth,
      x: 0, // NOTE: Will be set during drawing
      y: 0, // NOTE: Will be set during drawing
    };

    // Add step for creating this node
    this.steps.push({
      description: `Creating node with median ${median.toFixed(1)} - ${
        centerIntervals.length
      } center, ${leftIntervals.length} left, ${rightIntervals.length} right`,
      tree: this.copyTree(this.tree),
      intervals: intervals,
      currentNode: node,
      highlightedIntervals: centerIntervals,
      median: median,
      leftIntervals: leftIntervals,
      rightIntervals: rightIntervals,
      centerIntervals: centerIntervals,
      algorithmStep: 3 + depth,
      eventSets: {
        intervals: intervals.map((interval, i) => {
          let status = "pending";
          if (centerIntervals.includes(interval)) status = "center";
          else if (leftIntervals.includes(interval)) status = "left";
          else if (rightIntervals.includes(interval)) status = "right";
          return {
            interval: interval,
            index: i,
            status: status,
          };
        }),
        nodes: [
          {
            node: node,
            status: "creating",
          },
        ],

        eventQueue: [
          {
            label: `Partition by median ${median.toFixed(1)}`,
            status: "current",
          },
        ],
        activeSet: centerIntervals.map((iv) => ({
          label: `Center [${iv.start.toFixed(1)}, ${iv.end.toFixed(1)}]`,
          status: "active",
          interval: iv,
        })),
        output: [
          {
            label: `Node(m=${median.toFixed(1)}) with ${
              centerIntervals.length
            } center`,
            status: "new",
          },
        ],
      },
    });

    // Recursively build subtrees
    if (leftIntervals.length > 0) {
      node.left = this.buildTreeRecursive(leftIntervals, depth + 1);
    }
    if (rightIntervals.length > 0) {
      node.right = this.buildTreeRecursive(rightIntervals, depth + 1);
    }

    return node;
  }

  copyTree(node) {
    if (!node) return null;
    return {
      median: node.median,
      centerIntervals: [...node.centerIntervals],
      left: this.copyTree(node.left),
      right: this.copyTree(node.right),
      depth: node.depth,
      x: node.x,
      y: node.y,
    };
  }

  countNodes(node) {
    if (!node) return 0;
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }

  getCurrentStep() {
    if (this.steps.length === 0) this.computeSteps();
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
