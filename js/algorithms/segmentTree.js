/**
 * Segment Tree Algorithm
 * This implementation builds a Segment Tree by building a canonical tree over
 * elementary disjoint intervals (slabs) between endpoints of the given intervals.
 * It then assigns each interval to the minimal set of nodes that fully cover it.
 * - Resources:
 *   - https://en.wikipedia.org/wiki/Segment_tree
 *   - Section 10.3, "Segment Trees", in "Computational Geometry: Algorithms and Applications" by Mark de Berg et al.
 */

class SegmentTreeAlgorithm {
  constructor() {
    this.intervals = [];
    this.steps = [];
    this.currentStep = 0;
    this.tree = null; // Root node
    this.endpoints = [];
    this.slabs = []; // Elementary disjoint intervals between endpoints
    this.numberLineMin = 0;
    this.numberLineMax = 100;
  }

  addInterval(interval) {
    this.intervals.push(interval);
    this.reset();
  }

  removeInterval(interval) {
    const index = this.intervals.findIndex((i) => i.equals(interval));
    if (index !== -1) {
      this.intervals.splice(index, 1);
      this.reset();
    }
  }

  clear() {
    this.intervals = [];
    this.reset();
  }

  reset() {
    this.steps = [];
    this.currentStep = 0;
    this.tree = null;
    this.endpoints = [];
    this.slabs = [];
  }

  computeSteps() {
    if (this.intervals.length === 0) {
      this.steps = [
        {
          description: "No intervals to process",
          intervals: [],
          tree: null,
          endpoints: [],
          slabs: [],
          algorithmStep: 0,
          eventSets: { intervals: [], nodes: [] },
        },
      ];
      return;
    }

    this.steps = [];
    // Step 1: Show initial intervals
    this.steps.push({
      description: `Starting with ${this.intervals.length} intervals`,
      intervals: [...this.intervals],
      tree: null,
      endpoints: [],
      slabs: [],
      algorithmStep: 0,
      eventSets: {
        intervals: this.intervals.map((it, i) => ({
          interval: it,
          index: i,
          status: "pending",
        })),
        nodes: [],

        eventQueue: this.intervals.map((it, i) => ({
          label: `I${i + 1}: [${it.start.toFixed(1)}, ${it.end.toFixed(1)}]`,
          status: "pending",
          interval: it,
        })),
        activeSet: [],
        output: [],
      },
    });

    // Step 2: Collect and sort unique endpoints
    const pts = new Set();
    for (const it of this.intervals) {
      pts.add(+it.start.toFixed(4));
      pts.add(+it.end.toFixed(4));
    }
    const endpoints = Array.from(pts).sort((a, b) => a - b);
    this.endpoints = endpoints;
    this.steps.push({
      description: `Collect unique endpoints and sort (${endpoints.length})`,
      intervals: [...this.intervals],
      tree: null,
      endpoints: [...endpoints],
      slabs: [],
      algorithmStep: 1,
      eventSets: {
        intervals: this.intervals.map((it, i) => ({
          interval: it,
          index: i,
          status: "sorted",
        })),
        nodes: [],

        eventQueue: endpoints.map((e, idx) => ({
          label: `Endpoint e${idx} = ${e.toFixed(1)}`,
          status: "pending",
          x: e,
        })),
        activeSet: [],
        output: [],
      },
    });

    // Step 3: Build elementary slabs (half-open [e[i], e[i+1]))
    const slabs = [];
    for (let i = 0; i < endpoints.length - 1; i++) {
      slabs.push({ start: endpoints[i], end: endpoints[i + 1] });
    }
    this.slabs = slabs;
    this.steps.push({
      description: `Build elementary slabs (${slabs.length})`,
      intervals: [...this.intervals],
      tree: null,
      endpoints: [...endpoints],
      slabs: [...slabs],
      algorithmStep: 2,
      eventSets: {
        intervals: this.intervals.map((it, i) => ({
          interval: it,
          index: i,
          status: "pending",
        })),
        nodes: [],

        eventQueue: slabs.map((s, idx) => ({
          label: `Slab s${idx}: [${s.start.toFixed(1)}, ${s.end.toFixed(1)}]`,
          status: "processed",
          interval: [s.start, s.end],
        })),
        activeSet: [],
        output: [],
      },
    });

    // Step 4: Build canonical segment tree over slabs indices
    this.tree = this._buildTree(0, slabs.length - 1);
    this.steps.push({
      description: `Build canonical segment tree over slabs`,
      intervals: [...this.intervals],
      tree: this._copyTree(this.tree),
      endpoints: [...endpoints],
      slabs: [...slabs],
      algorithmStep: 3,
      eventSets: {
        intervals: this.intervals.map((it, i) => ({
          interval: it,
          index: i,
          status: "pending",
        })),
        nodes: [],

        eventQueue: [
          {
            label: "Build full binary tree over slab indices",
            status: "processed",
          },
        ],
        activeSet: [],
        output: [],
      },
    });

    // Step 5 (iter): Assign each interval to minimal set of nodes fully covered
    let stepIdx = 4;
    for (let i = 0; i < this.intervals.length; i++) {
      const it = this.intervals[i];
      const lo = this._lowerBound(endpoints, it.start);
      const hi = Math.max(lo, this._lowerBound(endpoints, it.end) - 1);
      // cover [lo, hi] in slab index space
      const coveredNodes = [];
      this._assignInterval(this.tree, 0, slabs.length - 1, lo, hi, (node) => {
        node.items.push(it);
        coveredNodes.push(node);
      });
      this.steps.push({
        description: `Assign interval ${i + 1} to fully covered nodes`,
        intervals: [...this.intervals],
        tree: this._copyTree(this.tree),
        endpoints: [...endpoints],
        slabs: [...slabs],
        algorithmStep: stepIdx++,
        currentInterval: it,
        eventSets: {
          intervals: this.intervals.map((iv, j) => ({
            interval: iv,
            index: j,
            status: j < i ? "processed" : j === i ? "current" : "pending",
          })),
          nodes: coveredNodes.map((n) => ({
            node: { l: n.l, r: n.r },
            status: "assigned",
          })),

          eventQueue: [
            {
              label: `Cover slabs [${lo}..${hi}] for I${i + 1}`,
              status: "current",
            },
          ],
          activeSet: coveredNodes.map((n) => ({
            label: `Node [${n.l}, ${n.r}]`,
            status: "active",
            node: { l: n.l, r: n.r },
          })),
          output: [
            {
              label: `Assigned I${i + 1} to ${coveredNodes.length} nodes`,
              status: "new",
            },
          ],
        },
      });
    }

    // Final step
    this.steps.push({
      description: "Segment tree construction complete!",
      intervals: [...this.intervals],
      tree: this._copyTree(this.tree),
      endpoints: [...endpoints],
      slabs: [...slabs],
      algorithmStep: 100,
      eventSets: {
        intervals: this.intervals.map((it, i) => ({
          interval: it,
          index: i,
          status: "completed",
        })),
        nodes: [],
      },
    });
  }

  // Helpers
  _buildTree(l, r) {
    if (l > r) return null;
    const node = { l, r, items: [], left: null, right: null };
    if (l === r) return node;
    const mid = Math.floor((l + r) / 2);
    node.left = this._buildTree(l, mid);
    node.right = this._buildTree(mid + 1, r);
    return node;
  }

  _assignInterval(node, l, r, ql, qr, onCover) {
    if (!node || ql > r || qr < l) return;
    if (ql <= l && r <= qr) {
      onCover(node);
      return;
    }
    const mid = Math.floor((l + r) / 2);
    this._assignInterval(node.left, l, mid, ql, qr, onCover);
    this._assignInterval(node.right, mid + 1, r, ql, qr, onCover);
  }

  _lowerBound(arr, x) {
    let lo = 0,
      hi = arr.length;
    while (lo < hi) {
      const md = (lo + hi) >> 1;
      if (arr[md] < x) lo = md + 1;
      else hi = md;
    }
    return lo;
  }

  _copyTree(node) {
    if (!node) return null;
    return {
      l: node.l,
      r: node.r,
      items: [...node.items],
      left: this._copyTree(node.left),
      right: this._copyTree(node.right),
    };
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
