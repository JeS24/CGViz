/**
 * Randomizer helper for CGViz
 * - Moves randomized input generation out of UI controls.
 * - API: window.Randomizer.applyRandomize(uiControls, opts)
 */

(function () {
  function applyRandomize(uiControls, opts = {}) {
    try {
      const algName = uiControls?.algorithmSelect?.value ?? "";
      const count = parseInt(
        opts.count ?? uiControls?.randCountEl?.value ?? "30",
        10
      );
      const distribution =
        opts.distribution ?? uiControls?.randDistributionEl?.value ?? "uniform";
      const size = parseInt(
        opts.size ?? uiControls?.randSizeEl?.value ?? "100",
        10
      );
      const minInterval = parseInt(
        opts.minInterval ?? uiControls?.randIntervalMinEl?.value ?? "10",
        10
      );

      const samePoint = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 6;
      const pointExists = (p, arr) =>
        Array.isArray(arr) && arr.some((q) => samePoint(p, q));

      const makeSeededRng = (seed) =>
        window.Utils && window.Utils.makeSeededRng
          ? window.Utils.makeSeededRng(seed)
          : Math.random;

      let rnd = Math.random;
      if (
        opts.seed !== undefined &&
        opts.seed !== null &&
        String(opts.seed).trim() !== ""
      ) {
        try {
          const seedNum = Number(opts.seed);
          const seedForRng = isFinite(seedNum) ? seedNum : String(opts.seed);
          rnd = makeSeededRng(seedForRng);
          if (typeof window.setRandomSeed === "function")
            try {
              window.setRandomSeed(seedForRng);
            } catch (e) {}
        } catch (e) {
          rnd = Math.random;
        }
      }

      if (
        window.algorithmManager &&
        typeof window.algorithmManager.softClear === "function"
      )
        window.algorithmManager.softClear();

      const pad = 40;
      const w = (typeof width !== "undefined" ? width : 800) - 2 * pad;
      const h = (typeof height !== "undefined" ? height : 600) - 2 * pad;
      const cx = pad + w / 2;
      const cy = pad + h / 2;

      const rngPoint = () => {
        if (distribution === "circle") {
          const r = rnd() * size;
          const t = rnd() * Math.PI * 2;
          return new Point(cx + r * Math.cos(t), cy + r * Math.sin(t));
        }
        if (distribution === "clustered") {
          const cluster =
            rnd() < 0.5
              ? { x: cx - size / 2, y: cy - size / 2 }
              : { x: cx + size / 2, y: cy + size / 2 };
          return new Point(
            cluster.x + (rnd() - 0.5) * size,
            cluster.y + (rnd() - 0.5) * size
          );
        }
        if (distribution === "grid") {
          const cols = Math.max(2, Math.floor(Math.sqrt(count)));
          const rows = Math.max(2, Math.ceil(count / cols));
          const i = Math.floor(rnd() * cols);
          const j = Math.floor(rnd() * rows);
          return new Point(
            pad + (i + 0.5) * (w / cols) + (rnd() - 0.5) * (w / cols) * 0.2,
            pad + (j + 0.5) * (h / rows) + (rnd() - 0.5) * (h / rows) * 0.2
          );
        }
        return new Point(pad + rnd() * w, pad + rnd() * h);
      };

      const addPoints = (n) => {
        const added = [];
        let attempts = 0;
        const existing = window.algorithmManager?.getPoints
          ? window.algorithmManager.getPoints()
          : [];
        while (added.length < n && attempts < n * 10) {
          const p = rngPoint();
          if (!pointExists(p, existing) && !pointExists(p, added)) {
            window.algorithmManager?.addPoint?.(p);
            added.push(p);
          }
          attempts++;
        }
      };

      const addSegments = (n) => {
        const pairs = [];
        let attempts = 0;
        while (pairs.length < n && attempts < n * 10) {
          const p1 = rngPoint();
          const p2 = rngPoint();
          if (samePoint(p1, p2)) {
            attempts++;
            continue;
          }
          const exists = pairs.some(
            (s) =>
              (samePoint(s.p1, p1) && samePoint(s.p2, p2)) ||
              (samePoint(s.p1, p2) && samePoint(s.p2, p1))
          );
          if (!exists) {
            pairs.push({ p1, p2 });
            window.algorithmManager?.addSegment?.(new LineSegment(p1, p2));
          }
          attempts++;
        }
      };

      const addIntervals = (n) => {
        const range = 100;
        const added = [];
        let attempts = 0;
        while (added.length < n && attempts < n * 10) {
          let a = rnd() * range;
          let b = rnd() * range;
          if (Math.abs(a - b) < minInterval)
            b = a + (Math.sign(rnd() - 0.5) || 1) * (minInterval + rnd() * 10);
          const it = new Interval(Math.min(a, b), Math.max(a, b));
          if (
            !added.some(
              (ex) =>
                Math.abs(ex.start - it.start) < 1 &&
                Math.abs(ex.end - it.end) < 1
            )
          ) {
            window.algorithmManager?.addInterval?.(it);
            added.push(it);
          }
          attempts++;
        }
      };

      const addRectangles = (n) => {
        const added = [];
        let attempts = 0;
        while (added.length < n && attempts < n * 10) {
          const p1 = rngPoint();
          const p2 = rngPoint();
          if (samePoint(p1, p2)) {
            attempts++;
            continue;
          }
          const rect = Rectangle.fromPoints(p1, p2);
          if (
            !added.some(
              (r) =>
                Math.abs(r.x1 - rect.x1) < 4 &&
                Math.abs(r.y1 - rect.y1) < 4 &&
                Math.abs(r.x2 - rect.x2) < 4 &&
                Math.abs(r.y2 - rect.y2) < 4
            )
          ) {
            window.algorithmManager?.addRectangle?.(rect);
            added.push(rect);
          }
          attempts++;
        }
      };

      const addLines = (n) => {
        const added = [];
        let attempts = 0;
        while (added.length < n && attempts < n * 10) {
          const p1 = rngPoint();
          const p2 = rngPoint();
          if (samePoint(p1, p2)) {
            attempts++;
            continue;
          }
          const ln = DualLine.fromPoints(p1, p2);
          if (
            !added.some(
              (l) =>
                Math.abs(l.slope - ln.slope) < 0.01 &&
                Math.abs(l.intercept - ln.intercept) < 10
            )
          ) {
            window.algorithmManager?.addLine?.(ln);
            added.push(ln);
          }
          attempts++;
        }
      };

      switch (algName) {
        case "grahamScan":
        case "giftWrap":
        case "quickHull":
        case "delaunay":
        case "voronoi":
        case "fortuneVoronoi":
          addPoints(count);
          break;
        case "triangulation":
        case "artGallery": {
          const target = Math.max(3, Math.min(count, 50));
          const pts = Array.from({ length: target }, () => rngPoint());
          const c = pts.reduce(
            (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
            { x: 0, y: 0 }
          );
          c.x /= pts.length;
          c.y /= pts.length;
          pts.sort(
            (a, b) =>
              Math.atan2(a.y - c.y, a.x - c.x) -
              Math.atan2(b.y - c.y, b.x - c.x)
          );
          const alg = window.algorithmManager?.getCurrentAlgorithm?.();
          pts.forEach((p) => {
            if (alg && typeof alg.addVertex === "function")
              alg.addVertex(p.x, p.y);
            else window.algorithmManager?.addPoint?.(p);
          });
          break;
        }
        case "intervalTree":
        case "segmentTree": {
          const n = Math.floor(count / 3);
          const k = Math.max(2, Math.min(50, isFinite(n) ? n : 2));
          addIntervals(k);
          break;
        }
        case "rectangleUnion":
        case "rectangleIntersection": {
          const n = Math.floor(count / 2);
          const k = Math.max(2, Math.min(50, isFinite(n) ? n : 2));
          addRectangles(k);
          break;
        }
        case "segmentIntersection": {
          const n = Math.floor(count);
          const k = Math.max(3, Math.min(50, isFinite(n) ? n : 3));
          addSegments(k);
          break;
        }
        case "duality": {
          addPoints(count);
          const lnCount = Math.max(1, Math.min(50, Math.floor(count / 2)));
          addLines(lnCount);
          break;
        }
      }

      try {
        uiControls.updateButtons();
        uiControls.updateStepInfo();
      } catch (e) {}
      return true;
    } catch (err) {
      console.error("Randomizer.applyRandomize error:", err);
      try {
        uiControls.updateButtons();
        uiControls.updateStepInfo();
      } catch (e) {}
      return false;
    }
  }

  if (!window.Randomizer) window.Randomizer = {};
  window.Randomizer.applyRandomize = applyRandomize;
})();
