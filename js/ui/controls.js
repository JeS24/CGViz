/**
 * UIControls for CGViz - handles:
 * - Algorithm selection
 * - Step navigation (prev/next)
 * - Playback controls (play/pause)
 * - Randomization options dynamically rendered, based on selected algorithm
 * - Dark mode, FPS, canvas text toggles
 * - Export functionality
 *
 * Known Issues: FIXME:
 * - [ ] Handle `artGallery` and `triangulation` special cases in the algorithm files themselves, as much as practical.
 * - [ ] Check TODO:s below.
 */

class UIControls {
  constructor() {
    this.algorithmSelect = document.getElementById("algorithm-select");
    this.clearBtn = document.getElementById("clear-btn");
    this.prevBtn = document.getElementById("prev-btn");
    this.nextBtn = document.getElementById("next-btn");
    this.playBtn = document.getElementById("play-btn");
    this.speedSlider = document.getElementById("speed-slider");
    this.pointSizeSlider = document.getElementById("point-size");
    this.darkModeToggle = document.getElementById("dark-mode-toggle");
    this.fpsToggle = document.getElementById("fps-toggle");
    this.canvasTextToggle = document.getElementById("canvas-text-toggle");
    this.focusCanvasToggle = document.getElementById("focus-canvas-toggle");
    this.exportBtn = document.getElementById("export-btn");
    this.exportFormat = document.getElementById("export-format");

    // Controls: Randomize
    this.randomizeBtn = document.getElementById("randomize-btn");
    // NOTE: rand-count is created dynamically per-algorithm inside #rand-dynamic-options
    this.randCountEl = null;
    this.randDistributionEl = document.getElementById("rand-distribution");
    this.randSizeEl = document.getElementById("rand-size");
    this.randSizeValueEl = document.getElementById("rand-size-value");
    this.randIntervalMinEl = document.getElementById("rand-interval-min");
    this.randIntervalMinValueEl = document.getElementById(
      "rand-interval-min-value"
    );

    this.instructionsEl = document.getElementById("instructions");
    this.stepInfoEl = document.getElementById("step-info");
    this.algorithmInfoEl = document.getElementById("algorithm-info");
    this.stepsListEl = document.getElementById("steps-list");
    this.eventSetsEl = document.getElementById("event-sets-content");

    this.isPlaying = false;
    this.playInterval = null;

    this.setupEventListeners();

    // Only update instructions if the instructions element exists
    if (this.instructionsEl) {
      this.updateInstructions();
    }

    // Initialize UI state after a short delay to ensure everything is loaded
    setTimeout(() => {
      this.updateButtons();
      this.updateStepInfo();
    }, 100);

    // Expose a programmatic entry for randomize popover
    // TODO: Should we include here instead of binding?
    try {
      window.applyRandomize = this.applyRandomize.bind(this);
      window.renderRandomizeOptions = this.renderRandomizeOptions?.bind(this);
    } catch (e) {}
  }

  // Render algorithm-specific options into the randomize popover
  renderRandomizeOptions(algorithm) {
    const container = document.getElementById("rand-dynamic-options");
    if (!container) return;
    container.innerHTML = "";

    // Helper to create the shared count control markup and wire events
    const makeCountControl = (labelText, min, max, value) => {
      const html = `
        <div class="control-group-randomize">
          <div class="count-row-header">
            <label for="rand-count">${labelText}</label>
            <span id="rand-count-value-pop">${value}</span>
          </div>
          <input aria-label="Random count" type="range" id="rand-count" min="${min}" max="${max}" value="${value}" />
        </div>`;
      container.insertAdjacentHTML("beforeend", html);
      // Cache reference and wire events
      this.randCountEl = document.getElementById("rand-count");
      const valueSpan = document.getElementById("rand-count-value-pop");
      if (this.randCountEl && valueSpan) {
        this.randCountEl.addEventListener("input", (e) => {
          valueSpan.textContent = e.target.value;
        });
      }
    };

    // Default values
    let label = "Points (3-200)";
    let min = 3;
    let max = 200;
    let value = 30;

    // Algorithm-specific labels and slider ranges, based on algo & to keep max runtime low
    switch (algorithm) {
      case "triangulation":
      case "artGallery":
        label = "Vertices (3-50)";
        min = 3;
        max = 50;
        value = Math.max(
          3,
          Math.min(30, Number(this.randCountEl?.value || 30))
        );
        break;
      case "rectangleUnion":
      case "rectangleIntersection":
        label = "Rectangles (2-50)";
        min = 2;
        max = 50;
        value = Math.max(
          2,
          Math.min(10, Number(this.randCountEl?.value || 10))
        );
        break;
      case "segmentIntersection":
        label = "Lines (3-50)";
        min = 3;
        max = 50;
        value = Math.max(
          3,
          Math.min(20, Number(this.randCountEl?.value || 20))
        );
        break;
      case "intervalTree":
      case "segmentTree":
        label = "Intervals (2-50)";
        min = 2;
        max = 50;
        value = Math.max(
          2,
          Math.min(30, Number(this.randCountEl?.value || 30))
        );
        break;
      case "duality":
        label = "Points (for duality) (1-200)";
        min = 1;
        max = 200;
        value = Math.max(
          1,
          Math.min(50, Number(this.randCountEl?.value || 50))
        );
        break;
      default:
        label = "Points (3-200)";
        min = 3;
        max = 200;
        value = Math.max(
          3,
          Math.min(30, Number(this.randCountEl?.value || 30))
        );
        break;
    }

    // Count control
    makeCountControl(label, min, max, value);

    // Algorithm-specific auxiliary controls
    if (algorithm === "intervalTree" || algorithm === "segmentTree") {
      const minHtml = `
        <div class="control-group-randomize">
          <div class="count-row-header">
            <label for="rand-interval-min">Min interval length</label>
            <span id="rand-interval-min-value">10</span>
          </div>
          <input aria-label="Min interval length" type="range" id="rand-interval-min" min="2" max="50" value="10" />
        </div>`;
      container.insertAdjacentHTML("beforeend", minHtml);
      setTimeout(() => {
        const el = document.getElementById("rand-interval-min");
        const valEl = document.getElementById("rand-interval-min-value");
        if (el && valEl)
          el.addEventListener("input", () => (valEl.textContent = el.value));
        // cache to UIControls instance for applyRandomize
        this.randIntervalMinEl = document.getElementById("rand-interval-min");
        this.randIntervalMinValueEl = document.getElementById(
          "rand-interval-min-value"
        );
      }, 10);
    }
  }

  // Setup all event listeners for UI controls
  setupEventListeners() {
    this.algorithmSelect.addEventListener("change", () => {
      this.onAlgorithmChange();
    });

    this.clearBtn.addEventListener("click", () => {
      this.onClear();
    });

    this.prevBtn.addEventListener("click", () => {
      this.onPrevStep();
    });

    this.nextBtn.addEventListener("click", () => {
      this.onNextStep();
    });

    this.playBtn.addEventListener("click", () => {
      this.onPlayToggle();
    });

    this.speedSlider.addEventListener("input", () => {
      this.updatePlaySpeed();
    });

    // Setup export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        window.exportCanvas();
      });
    }

    // Focus Canvas: use a dedicated button to toggle focus mode
    this.focusCanvasBtn = document.getElementById("focus-canvas-btn");
    if (this.focusCanvasBtn) {
      // Prevent clicks from bubbling to the canvas
      this.focusCanvasBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isPressed =
          this.focusCanvasBtn.getAttribute("aria-pressed") === "true";
        const next = !isPressed;
        console.debug("[UIControls] focus-canvas-btn clicked, next=", next);
        window.setFocusCanvas && window.setFocusCanvas(next);
      });
    }

    // Initialize randomize count display if available
    if (this.randSizeEl) {
      this.randSizeEl.addEventListener("input", () => {
        this.randSizeValueEl.textContent = this.randSizeEl.value;
      });
    }
    if (this.randIntervalMinEl) {
      this.randIntervalMinEl.addEventListener("input", () => {
        this.randIntervalMinValueEl.textContent = this.randIntervalMinEl.value;
      });
    }
    if (this.randomizeBtn) {
      this.randomizeBtn.addEventListener("click", () => {
        this.applyRandomize();
      });
    }
  }

  // Bind toggles that may be created after UIControls is constructed
  setupCanvasToggles() {
    // Re-query toggles in case they were added later to the DOM
    this.darkModeToggle = document.getElementById("dark-mode-toggle");
    this.fpsToggle = document.getElementById("fps-toggle");
    this.canvasTextToggle = document.getElementById("canvas-text-toggle");

    const stopEvents = (el) => {
      if (!el) return;
      [
        "click",
        "mousedown",
        "mouseup",
        "pointerdown",
        "pointerup",
        "touchstart",
        "touchend",
      ].forEach((ev) =>
        el.addEventListener(ev, (evn) => evn.stopPropagation())
      );
      // For keyboard events, do not stop propagation when Ctrl/Alt/Meta/Shift are held.
      el.addEventListener("keydown", (evn) => {
        if (evn.ctrlKey || evn.altKey || evn.metaKey || evn.shiftKey) return;
        evn.stopPropagation();
      });
    };

    // Dark mode toggle
    if (this.darkModeToggle) {
      // initialize - prefer existing var if present, fall back to window
      try {
        const cur =
          typeof darkMode !== "undefined" ? darkMode : window.darkMode;
        this.darkModeToggle.checked = !!cur;
      } catch (e) {}
      // Make the native input non-focusable; we'll make the label act as the focusable switch
      this.darkModeToggle.tabIndex = -1;

      const darkLabel = this.darkModeToggle.closest(".control-toggle");
      if (darkLabel) {
        stopEvents(darkLabel);
        // ARIA: label acts as switch
        darkLabel.setAttribute("role", "switch");
        darkLabel.setAttribute("aria-label", "Dark Mode");
        darkLabel.tabIndex = 0; // make it keyboard-focusable
        // initialize aria-checked
        darkLabel.setAttribute(
          "aria-checked",
          this.darkModeToggle.checked ? "true" : "false"
        );

        // Space/Enter toggles the checkbox
        darkLabel.addEventListener("keydown", (ke) => {
          // Respect modifier keys: allow Ctrl/Alt/Meta/Shift combos to pass through
          if (ke.ctrlKey || ke.altKey || ke.metaKey || ke.shiftKey) return;
          if (ke.key === " " || ke.key === "Spacebar" || ke.key === "Enter") {
            ke.preventDefault();
            this.darkModeToggle.checked = !this.darkModeToggle.checked;
            this.darkModeToggle.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
        });
      }

      this.darkModeToggle.addEventListener("change", (e) => {
        e.stopPropagation();
        // Prefer calling main-provided setter so globals update
        const newVal = !!this.darkModeToggle.checked;
        // Call setter if provided, then also mirror to globals to be safe
        if (typeof window.setDarkMode === "function") {
          try {
            window.setDarkMode(newVal);
          } catch (err) {}
        }
        try {
          window.darkMode = newVal;
        } catch (err) {}
        try {
          if (typeof darkMode !== "undefined") darkMode = newVal;
        } catch (err) {}
        document.body.classList.toggle("dark-mode", newVal);
        // Sync aria state on the label if present
        if (darkLabel)
          darkLabel.setAttribute("aria-checked", newVal ? "true" : "false");
      });
    }

    // FPS toggle
    if (this.fpsToggle) {
      try {
        const cur = typeof showFPS !== "undefined" ? showFPS : window.showFPS;
        this.fpsToggle.checked = !!cur;
      } catch (e) {}
      // Make native input non-focusable; label acts as switch
      this.fpsToggle.tabIndex = -1;

      const fpsLabel = this.fpsToggle.closest(".control-toggle");
      if (fpsLabel) {
        stopEvents(fpsLabel);
        fpsLabel.setAttribute("role", "switch");
        fpsLabel.setAttribute("aria-label", "Show FPS");
        fpsLabel.tabIndex = 0;
        fpsLabel.setAttribute(
          "aria-checked",
          this.fpsToggle.checked ? "true" : "false"
        );

        fpsLabel.addEventListener("keydown", (ke) => {
          if (ke.ctrlKey || ke.altKey || ke.metaKey || ke.shiftKey) return;
          if (ke.key === " " || ke.key === "Spacebar" || ke.key === "Enter") {
            ke.preventDefault();
            this.fpsToggle.checked = !this.fpsToggle.checked;
            this.fpsToggle.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
        });
      }

      // Also ensure clicks on the visible control (label/button) toggle the FPS state even in focus mode
      if (fpsLabel) {
        fpsLabel.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.fpsToggle.checked = !this.fpsToggle.checked;
          this.fpsToggle.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      this.fpsToggle.addEventListener("change", (e) => {
        e.stopPropagation();
        const newVal = !!this.fpsToggle.checked;
        if (typeof window.setShowFPS === "function") {
          try {
            window.setShowFPS(newVal);
          } catch (err) {}
        }
        try {
          window.showFPS = newVal;
        } catch (err) {}
        try {
          if (typeof showFPS !== "undefined") showFPS = newVal;
        } catch (err) {}
        const fpsCounter = document.getElementById("fps-counter");
        if (fpsCounter) fpsCounter.style.display = newVal ? "block" : "none";
        if (fpsLabel)
          fpsLabel.setAttribute("aria-checked", newVal ? "true" : "false");
      });
    }

    // Canvas text toggle (hides/shows info text drawn on canvas)
    if (this.canvasTextToggle) {
      try {
        const cur =
          typeof showCanvasText !== "undefined"
            ? showCanvasText
            : window.showCanvasText;
        this.canvasTextToggle.checked = !!cur;
      } catch (e) {}

      // Make native input non-focusable; label acts as switch
      this.canvasTextToggle.tabIndex = -1;

      const canvasTextLabel = this.canvasTextToggle.closest(".control-toggle");
      if (canvasTextLabel) {
        stopEvents(canvasTextLabel);
        canvasTextLabel.setAttribute("role", "switch");
        canvasTextLabel.setAttribute("aria-label", "Show Canvas Text");
        canvasTextLabel.tabIndex = 0;
        canvasTextLabel.setAttribute(
          "aria-checked",
          this.canvasTextToggle.checked ? "true" : "false"
        );

        // Space/Enter toggles the checkbox
        canvasTextLabel.addEventListener("keydown", (ke) => {
          if (ke.ctrlKey || ke.altKey || ke.metaKey || ke.shiftKey) return;
          if (ke.key === " " || ke.key === "Spacebar" || ke.key === "Enter") {
            ke.preventDefault();
            this.canvasTextToggle.checked = !this.canvasTextToggle.checked;
            this.canvasTextToggle.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
        });

        // Click on visible label should also toggle
        // Also suppresses canvas clicks briefly, so, the click doesn't fall through
        canvasTextLabel.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.canvasTextToggle.checked = !this.canvasTextToggle.checked;
          this.canvasTextToggle.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        });
      }

      this.canvasTextToggle.addEventListener("change", (e) => {
        e.stopPropagation();
        const newVal = !!this.canvasTextToggle.checked;
        if (typeof window.setShowCanvasText === "function") {
          try {
            window.setShowCanvasText(newVal);
          } catch (err) {}
        }
        try {
          window.showCanvasText = newVal;
        } catch (err) {}
        try {
          if (typeof showCanvasText !== "undefined") showCanvasText = newVal;
        } catch (err) {}
        if (canvasTextLabel)
          canvasTextLabel.setAttribute(
            "aria-checked",
            newVal ? "true" : "false"
          );
      });
    }
  }

  // Handle algorithm selection change
  onAlgorithmChange() {
    const algorithm = this.algorithmSelect.value;

    if (window.algorithmManager) {
      window.algorithmManager.setAlgorithm(algorithm);
    }

    this.updateInstructions();
    this.updateRandomizeVisibility();
    this.renderRandomizeOptions(algorithm);
    this.updateRandomizeVisibility();
    this.updateButtons();
    this.updateStepInfo();
  }

  // Input Randomizer: accepts options from the popover
  applyRandomize(opts = {}) {
    // Delegate all randomization work to the centralized Randomizer helper.
    if (
      window.Randomizer &&
      typeof window.Randomizer.applyRandomize === "function"
    ) {
      return window.Randomizer.applyRandomize(this, opts);
    }
    console.error(
      "Randomizer.applyRandomize is not available. Ensure js/common/randomizer.js is loaded."
    );
    return false;
  }

  // Update visibility of randomization options, based on selected algorithm
  updateRandomizeVisibility() {
    const alg = this.algorithmSelect.value;
    const intervalRow = document.getElementById("rand-interval-row");
    const dualityRow = document.getElementById("rand-duality-row");
    const sizeRow = document.getElementById("rand-size-row");

    const showInterval = alg === "intervalTree" || alg === "segmentTree";
    const showDuality = alg === "duality";
    const showSize = !(alg === "intervalTree" || alg === "segmentTree");

    if (intervalRow)
      intervalRow.style.display = showInterval ? "block" : "none";
    if (dualityRow) dualityRow.style.display = showDuality ? "block" : "none";
    if (sizeRow) sizeRow.style.display = showSize ? "block" : "none";
  }

  onClear() {
    if (window.algorithmManager) {
      window.algorithmManager.clear();
    }
    this.stopAutoPlay();
    this.updateButtons();
    this.updateStepInfo();
  }

  onPrevStep() {
    if (window.algorithmManager) {
      window.algorithmManager.prevStep();
    }
    this.updateButtons();
    this.updateStepInfo();
  }

  onNextStep() {
    if (window.algorithmManager) {
      window.algorithmManager.nextStep();
    }
    this.updateButtons();
    this.updateStepInfo();
  }

  // Play-related methods
  onPlayToggle() {
    // Special handling for art gallery algorithm
    // TODO: Move to the algorithm itself + (separate issue) use the draw method in PolygonTriangulation
    if (window.algorithmManager.currentAlgorithm === "artGallery") {
      const algorithm = window.algorithmManager.getCurrentAlgorithm();
      if (
        !algorithm.polygon.isComplete &&
        algorithm.polygon.vertices.length >= 3
      ) {
        // Complete the polygon and compute guard placement
        algorithm.completePolygon();
        this.updateButtons();
        this.updateStepInfo();
        return;
      }
    }
    // Special handling for triangulation: auto-close the polygon before playback
    // TODO: Move to the algorithm itself
    if (window.algorithmManager.currentAlgorithm === "triangulation") {
      const algorithm = window.algorithmManager.getCurrentAlgorithm();
      if (
        algorithm &&
        algorithm.polygon &&
        !algorithm.polygon.isComplete &&
        algorithm.polygon.vertices.length >= 3
      ) {
        algorithm.completePolygon();
        this.updateButtons();
        this.updateStepInfo();
        return;
      }
    }

    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    this.isPlaying = true;
    try {
      console.debug(
        "startAutoPlay: interval starting, speed=",
        this.speedSlider?.value
      );
    } catch (e) {}
    this.playBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause-icon lucide-pause"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>';

    const speed = parseInt(this.speedSlider.value);
    const interval = 1100 - speed * 100; // 1000ms to 100ms

    this.playInterval = setInterval(() => {
      if (window.algorithmManager && window.algorithmManager.canGoNext()) {
        window.algorithmManager.nextStep();
        this.updateButtons();
        this.updateStepInfo();
      } else {
        this.stopAutoPlay();
      }
    }, interval);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    try {
      console.debug("stopAutoPlay: clearing interval (if any)");
    } catch (e) {}
    this.playBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';

    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  updatePlaySpeed() {
    if (this.isPlaying) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  updateButtons() {
    if (window.algorithmManager) {
      this.prevBtn.disabled = !window.algorithmManager.canGoPrev();
      this.nextBtn.disabled = !window.algorithmManager.canGoNext();

      if (!window.algorithmManager.canGoNext()) {
        this.stopAutoPlay();
      }
    }
  }

  updateStepInfo() {
    if (window.algorithmManager) {
      const step = window.algorithmManager.getCurrentStep();
      if (this.stepInfoEl) {
        if (step && step.description) {
          this.stepInfoEl.textContent = step.description;
        } else {
          this.stepInfoEl.textContent = "Ready to start";
        }
      }
      this.updateAlgorithmSteps();
      this.updateEventSets();
      window.algorithmManager.updateStepLog();
    }
  }

  // Updates the usage instructions & algo details,
  // shown in #algorithm-info-panel, based on the selected algorithm
  updateInstructions() {
    const algorithm = this.algorithmSelect.value;
    // Re-query elements, in case, they were added after UIControls was constructed
    this.instructionsEl =
      document.getElementById("instructions") || this.instructionsEl;
    this.algorithmInfoEl =
      document.getElementById("algorithm-info") || this.algorithmInfoEl;

    const instructions = {
      grahamScan: {
        left: "Add points",
        right: "Remove points",
        middle: "Pan",
        wheel: "Zoom",
      },
      giftWrap: {
        left: "Add points",
        right: "Remove points",
        middle: "Pan",
        wheel: "Zoom",
      },
      quickHull: {
        left: "Add points",
        right: "Remove points",
        middle: "Pan",
        wheel: "Zoom",
      },
      segmentIntersection: {
        left: "Click + drag to create segments",
        right: "Remove segments",
        middle: "Pan",
        wheel: "Zoom",
      },
      triangulation: {
        left: "Add vertices (in order)",
        right: "Remove vertices",
        middle: "Pan",
        wheel: "Zoom",
      },
      delaunay: {
        left: "Add points",
        right: "Remove points",
        middle: "Pan",
        wheel: "Zoom",
      },
      voronoi: {
        left: "Add sites",
        right: "Remove sites",
        middle: "Pan",
        wheel: "Zoom",
      },
      fortuneVoronoi: {
        left: "Add sites",
        right: "Remove sites",
        middle: "Pan",
        wheel: "Zoom",
      },
      intervalTree: {
        left: "Click + drag to create intervals",
        right: "Remove intervals",
        middle: "Pan",
        wheel: "Zoom",
      },
      segmentTree: {
        left: "Click + drag to create intervals",
        right: "Remove intervals",
        middle: "Pan",
        wheel: "Zoom",
      },
      duality: {
        left: "Add point",
        right: "Remove points/lines",
        middle: "Pan",
        wheel: "Zoom",
      },
      rectangleUnion: {
        left: "Click + drag to create rectangles",
        right: "Remove rectangles",
        middle: "Pan",
        wheel: "Zoom",
      },
      rectangleIntersection: {
        left: "Click + drag to create rectangles",
        right: "Remove rectangles",
        middle: "Pan",
        wheel: "Zoom",
      },
      artGallery: {
        left: "Add polygon vertices",
        right: "Remove vertices",
        middle: "Pan",
        wheel: "Zoom",
      },
    };

    const algorithmInfo = {
      grahamScan: {
        desc: "Graham Scan builds a convex hull by sorting points by polar angle and using a stack-based approach.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Convex_hull",
            text: "Convex hull (Wikipedia)",
          },
          {
            url: "https://en.wikipedia.org/wiki/Graham_scan",
            text: "Graham scan (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=Y_X_eekYXEI",
            text: "Mod-04 Lec-08: Convex Hull Contd. — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Chapter 2, 'Convex Hulls' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      giftWrap: {
        desc: 'Gift Wrap (Jarvis March) finds the convex hull by "wrapping" around the points, selecting the most counter-clockwise point at each step.',
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Convex_hull",
            text: "Convex hull (Wikipedia)",
          },
          {
            url: "https://en.wikipedia.org/wiki/Gift_wrapping_algorithm",
            text: "Gift wrapping (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=QnL0LmOO4rc",
            text: "Mod-04 Lec-07: Convex Hull — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Chapter 6, Section 2, 'Finding Convex Hulls: Gift-Wrapping' in 'Computational Geometry and Computer Graphics in C++' by Michael J. Laszlo et al.",
          },
        ],
      },
      quickHull: {
        desc: "QuickHull uses a divide-and-conquer approach, recursively finding the farthest points from dividing lines.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Quickhull",
            text: "Quickhull (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=NYwgnBuGaxo",
            text: "Mod-04 Lec-09: Quick Hull — Dr. Sandeep Sen (NPTEL)",
          },
        ],
      },
      segmentIntersection: {
        desc: "The Line Sweep algorithm detects intersections by moving a vertical line left to right, processing segment endpoints as events, and maintaining an active set of segments.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Sweep_line_algorithm",
            text: "Sweep line algorithm (Wikipedia)",
          },
          {
            url: "",
            text: "Section 7.1, 'Plane Sweep Algorithms' in 'Computational Geometry & Computer Graphics in C++' by Michael J. Laszlo",
          },
          {
            url: "https://www.youtube.com/watch?v=_j1Qd9suN0s",
            text: "Mod-03 Lec-04: Line Sweep Method — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "https://www.youtube.com/watch?v=SVwItRH2DNU",
            text: "Mod-03 Lec-05: Segment Intersection — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Chapter 2, 'Line Segment Intersection' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      triangulation: {
        desc: 'Ear Clipping triangulates a polygon by repeatedly removing "ear" triangles.',
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Polygon_triangulation#Ear_clipping_method",
            text: "Ear clipping (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=aVrSr3IjpSI",
            text: "Triangulation of Arbitrary Polygon — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "See chapters on polygon triangulation in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      delaunay: {
        desc: "Bowyer-Watson algorithm builds Delaunay triangulation by incrementally adding points.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Delaunay_triangulation",
            text: "Delaunay triangulation (Wikipedia)",
          },
          {
            url: "https://en.wikipedia.org/wiki/Bowyer%E2%80%93Watson_algorithm",
            text: "Bowyer-Watson algorithm (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=IqdSdbxrTsY",
            text: "Mod-08 Lec-19: Delaunay Triangulation — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Chapter 9, 'Delaunay Triangulation' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      voronoi: {
        desc: "Voronoi diagrams partition space into regions based on proximity to sites. Each cell contains all points closest to its site. Constructed using the dual of Delaunay triangulation.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Voronoi_diagram",
            text: "Voronoi diagram (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=Yf01YxCotfU",
            text: "Mod-08 Lec-17: Voronoi Diagram: Properties — Dr. Pankaj Agarwal (NPTEL)",
          },
          {
            url: "https://www.youtube.com/watch?v=EFg7avIoSv8",
            text: "Mod-08 Lec-18: Voronoi Diagram Construction — Dr. Pankaj Agarwal (NPTEL)",
          },
          {
            url: "https://www.youtube.com/watch?v=IqdSdbxrTsY",
            text: "Mod-08 Lec-19: Delaunay Triangulation — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Section 8.4, 'Voronoi Diagrams' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      fortuneVoronoi: {
        desc: "Fortune's sweep-line algorithm constructs Voronoi diagrams by maintaining a beach line of parabolic arcs as a horizontal sweep line moves downward.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Voronoi_diagram",
            text: "Voronoi diagram (Wikipedia)",
          },
          {
            url: "https://en.wikipedia.org/wiki/Fortune%27s_algorithm",
            text: "Fortune's algorithm (Wikipedia)",
          },
          {
            url: "https://link.springer.com/article/10.1007/BF01840357",
            text: "Steven Fortune, 'A sweepline algorithm for Voronoi diagrams' (paper)",
          },
        ],
      },
      intervalTree: {
        desc: "Interval Tree is a binary search tree that efficiently stores intervals and supports fast interval queries. Each node stores a median value and intervals that cross that median.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Interval_tree",
            text: "Interval tree (Wikipedia)",
          },
          {
            url: "",
            text: "Section 10.1, 'Interval Trees' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      segmentTree: {
        desc: "Segment Tree stores aggregated data over disjoint elementary intervals (slabs) built from endpoints. Each node covers a range of slabs; an interval is stored in O(log n) nodes fully covered by it.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Segment_tree",
            text: "Segment tree (Wikipedia)",
          },
          {
            url: "",
            text: "Section 10.3, 'Segment Trees' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      duality: {
        desc: "Point-Line Duality transforms points to lines and lines to points. Here, Point (a,b) becomes dual line y = ax - b, and line y = mx + c becomes dual point (m,-c). This specific transformation preserves incidence relationships.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Duality_(projective_geometry)",
            text: "Duality (projective geometry) (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=0-k4xsvnnXU",
            text: "Mod-05 Lec-11: Intersection of Half Planes and Duality — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "https://www.youtube.com/watch?v=7eVa6N-28SQ",
            text: "Mod-05 Lec-12: Intersection of Half Planes and Duality (contd) — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "",
            text: "Section 8.2, 'Duality' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
      rectangleUnion: {
        desc: "Line Sweep algorithm for computing the area of union of rectangles. Uses vertical sweep line and maintains active rectangles to calculate total covered area.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Sweep_line_algorithm",
            text: "Sweep line algorithm (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=JwlKLYjP1R8",
            text: "Mod-03 Lec-06: Line Sweep — Rectangle Union — Dr. Sandeep Sen (NPTEL)",
          },
        ],
      },
      rectangleIntersection: {
        desc: "Line Sweep algorithm for computing the area of intersection of rectangles. Uses vertical sweep line to find regions where all rectangles overlap.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Sweep_line_algorithm",
            text: "Sweep line algorithm (Wikipedia)",
          },
        ],
      },
      artGallery: {
        desc: "Art Gallery Problem finds the minimum number of guards needed to watch an entire polygon gallery. Uses triangulation and 3-coloring to achieve optimal guard placement (≤ ⌊n/3⌋ guards). Start adding vertices. The last edge will be auto-added.",
        resources: [
          {
            url: "https://en.wikipedia.org/wiki/Art_gallery_problem",
            text: "Art Gallery Problem (Wikipedia)",
          },
          {
            url: "https://www.youtube.com/watch?v=RICtZA6K58s",
            text: "Mod-01 Lec-02: Visibility Problems — Dr. Sandeep Sen (NPTEL)",
          },
          {
            url: "https://archive.org/details/artgallerytheore0000orou",
            text: "Joseph O'Rourke, 'Art Gallery Theorems and Algorithms' (archive)",
          },
          {
            url: "",
            text: "Chapter 3, 'Art Gallery Theorem' in 'Computational Geometry: Algorithms and Applications' by Mark de Berg et al.",
          },
        ],
      },
    };

    // Write structured instruction pieces into their spans
    const instr = instructions[algorithm] || {
      left: "",
      right: "",
      middle: "",
      wheel: "",
    };

    const leftEl = document.querySelector(".instr-left");
    const rightEl = document.querySelector(".instr-right");
    const middleEl = document.querySelector(".instr-middle");
    const wheelEl = document.querySelector(".instr-wheel");

    if (leftEl) leftEl.textContent = instr.left || "";
    if (rightEl) rightEl.textContent = instr.right || "";
    if (middleEl) middleEl.textContent = instr.middle || "";
    if (wheelEl) wheelEl.textContent = instr.wheel || "";

    // Algorithm title and info in the panel
    const titleEl = document.getElementById("algorithm-title");
    const infoEl = document.getElementById("algorithm-info");
    if (titleEl)
      titleEl.textContent = (algorithm || "")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());

    // Algorithm description and resources
    // Schema: algorithmInfo[algo] : object {desc: string, resources: [string,...]}
    const infoEntry = algorithmInfo[algorithm];
    let desc = "";
    let resourcesArray = [];
    if (infoEntry && typeof infoEntry === "object") {
      desc = infoEntry.desc || "";
      resourcesArray = Array.isArray(infoEntry.resources)
        ? infoEntry.resources
        : [];
    }

    // Update the main algorithm-info text
    const targetInfoEl =
      infoEl ||
      this.algorithmInfoEl ||
      document.getElementById("algorithm-info");
    if (targetInfoEl) {
      targetInfoEl.textContent = desc || "";
    }

    // Ensures, there's a dedicated resources container right after
    // the algorithm-info element. Create, if missing.
    let resEl = document.getElementById("algorithm-info-resources");
    if (!resEl) {
      resEl = document.createElement("div");
      resEl.id = "algorithm-info-resources";
      resEl.className = "algorithm-info-resources";
      if (targetInfoEl && targetInfoEl.parentNode) {
        // insert after the info element
        targetInfoEl.parentNode.insertBefore(resEl, targetInfoEl.nextSibling);
      }
    }

    // Helper: creates link elements safely
    const makeLink = (href, text) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = text || href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return a;
    };

    // Populates resources as a semantic list
    resEl.innerHTML = ""; // clear previous
    if (resourcesArray.length > 0) {
      const ol = document.createElement("ol");
      ol.className = "algorithm-info-resources-list";

      resourcesArray.forEach((item) => {
        // Normalize item into {url, text}, when possible
        let resource = null;
        if (!item) return;
        if (typeof item === "object" && item.url !== undefined) {
          resource = {
            url: (item.url || "").trim(),
            text: (item.text || "").trim(),
          };
        }

        const li = document.createElement("li");
        li.className = "algorithm-info-resource-item";
        if (resource.url) {
          const a = makeLink(resource.url, resource.text || resource.url);
          li.appendChild(a);
        } else {
          // No URL: render as plain text
          li.textContent = resource.text;
        }
        ol.appendChild(li);
      });

      resEl.appendChild(ol);
      resEl.style.display = "block";
    } else {
      resEl.style.display = "none";
    }
  }

  // TODO: This is annoying sometimes. Remove?
  getPointSize() {
    return parseInt(this.pointSizeSlider.value);
  }

  updateAlgorithmSteps() {
    const algorithm = window.algorithmManager.getCurrentAlgorithm();
    const currentStep = algorithm.getCurrentStep();
    const steps = this.getAlgorithmSteps(
      window.algorithmManager.currentAlgorithm
    );

    this.stepsListEl.innerHTML = "";
    steps.forEach((step, index) => {
      const li = document.createElement("li");
      li.textContent = step;

      // Use algorithmStep from the current step if available
      const currentAlgorithmStep =
        currentStep && currentStep.algorithmStep !== undefined
          ? currentStep.algorithmStep
          : -1;

      if (index < currentAlgorithmStep) {
        li.classList.add("completed-step");
      } else if (index === currentAlgorithmStep) {
        li.classList.add("current-step");

        // Add backtrack indicator if this is a backtrack step
        if (currentStep && currentStep.isBacktrack) {
          li.classList.add("backtrack-step");
          li.textContent = "⬅ " + step + " (backtracking)";
        }
      }

      this.stepsListEl.appendChild(li);
    });
  }

  // Returns algorithm-specific steps for the current algorithm
  // NOTE: These map to the steps defined within each algorithm's implementation in code.
  // NOTE: If any step is removed or changed here or in the algorithm, it should be updated at both places.
  getAlgorithmSteps(algorithmName) {
    const steps = {
      grahamScan: [
        "Find bottom-most point",
        "Sort points by polar angle",
        "Initialize stack with first two points",
        "Process remaining points",
        "Remove points making clockwise turns",
        "Complete convex hull",
      ],
      giftWrap: [
        "Find leftmost point",
        "Select candidate point",
        "Test all other points",
        "Find most counter-clockwise",
        "Move to next hull point",
        "Complete gift wrapping",
      ],
      quickHull: [
        "Find extreme points (left/right)",
        "Divide points into upper/lower sets",
        "Find farthest point from line",
        "Recursively process left subset",
        "Recursively process right subset",
        "Complete QuickHull",
      ],
      segmentIntersection: [
        "Create event points from line segments",
        "Sort events by x-coordinate",
        "Initialize sweep line",
        "Process start events",
        "Check intersections with active segments",
        "Process end events",
        "Complete intersection detection",
      ],
      triangulation: [
        "Validate polygon (≥3 vertices)",
        "Find ear vertices",
        "Create triangle from ear",
        "Remove ear vertex",
        "Update remaining polygon",
        "Repeat until 3 vertices remain",
        "Add final triangle",
      ],
      delaunay: [
        "Create super triangle",
        "Add points incrementally",
        "Find triangles with point in circumcircle",
        "Remove bad triangles",
        "Create new triangles",
        "Update triangulation",
        "Remove super triangle",
      ],
      voronoi: [
        "Introduction to Voronoi diagrams",
        "Compute Delaunay triangulation",
        "Calculate circumcenters of triangles",
        "Identify triangles for each site",
        "Connect circumcenters to form cells",
        "Sort vertices by polar angle",
        "Construct Voronoi cells",
        "Visualize duality with Delaunay",
      ],
      fortuneVoronoi: [
        "Initialize event queue with sites (by y)",
        "Sweep line starts at first site",
        "Process site events; update beach line (parabola arcs)",
        "(Circle events omitted in this visualization)", // TODO: Add maybe? We can show them.
        "Finalize Voronoi (built via Delaunay)",
      ],
      segmentTree: [
        "Collect and sort unique endpoints",
        "Build elementary slabs from consecutive endpoints",
        "Build full binary tree over slab index range",
        "Assign each interval to fully covered nodes",
        "Segment tree ready for range queries",
      ],
      rectangleUnion: [
        "Initialize with rectangles",
        "Create boundary events (start/end)",
        "Sort events by x-coordinate",
        "Initialize sweep line",
        "Process start events (add rectangles)",
        "Calculate union height at sweep line",
        "Accumulate area contribution",
        "Process end events (remove rectangles)",
        "Complete union area calculation",
      ],
      rectangleIntersection: [
        "Initialize with rectangles",
        "Create boundary events (start/end)",
        "Sort events by x-coordinate",
        "Initialize sweep line",
        "Process start events (add rectangles)",
        "Calculate intersection height",
        "Accumulate intersection area",
        "Process end events (remove rectangles)",
        "Complete intersection area calculation",
      ],
      // TODO: Make this more granular. Triangulation steps are too high-level.
      artGallery: [
        "Complete polygon construction",
        "Triangulate polygon using ear clipping",
        "3-color the triangulation vertices",
        "Select guards from minimum color class",
        "Show visibility regions for guards",
      ],
    };
    return steps[algorithmName] || [];
  }

  // Updates the event sets panel with algorithm-specific events
  updateEventSets() {
    const algorithm = window.algorithmManager.getCurrentAlgorithm();
    const step = algorithm.getCurrentStep();
    const algorithmName = window.algorithmManager.currentAlgorithm;

    this.eventSetsEl.innerHTML = "";

    if (!step) {
      const noDataDiv = document.createElement("div");
      noDataDiv.className = "event-group";
      noDataDiv.innerHTML = "<p>Add points/segments to see event data</p>";
      this.eventSetsEl.appendChild(noDataDiv);
      return;
    }

    // 1. Render standardized event sets if provided by the algorithm
    this.renderStandardEventSets(step);

    // 2. Render algorithm-specific panels
    switch (algorithmName) {
      case "grahamScan":
        this.updateGrahamScanEvents(step, algorithm);
        break;
      case "giftWrap":
        this.updateGiftWrapEvents(step, algorithm);
        break;
      case "quickHull":
        this.updateQuickHullEvents(step, algorithm);
        break;
      case "segmentIntersection":
        this.updateLineSweepEvents(step, algorithm);
        break;
      case "triangulation":
        this.updateTriangulationEvents(step, algorithm);
        break;
      case "delaunay":
        this.updateDelaunayEvents(step, algorithm);
        break;
      case "voronoi":
        this.updateVoronoiEvents(step, algorithm);
        break;
      case "fortuneVoronoi":
        this.updateVoronoiEvents(step, algorithm);
        break;
      case "rectangleUnion":
        this.updateRectangleUnionEvents(step, algorithm);
        break;
      case "rectangleIntersection":
        this.updateRectangleIntersectionEvents(step, algorithm);
        break;
      case "segmentTree":
        this.updateSegmentTreeEvents(step, algorithm);
        break;
      case "artGallery":
        this.updateArtGalleryEvents(step, algorithm);
        break;
    }
  }

  // Generic renderer for standardized Event Sets schema:
  // step.eventSets = { eventQueue: [...], activeSet: [...], output: [...] }
  // Each item can have: { label?: string, status?: 'pending'|'current'|'active'|'new'|'processed'|'kept'|'completed'|'rejected', ...data }
  renderStandardEventSets(step) {
    if (!step || !step.eventSets) return;

    const { eventQueue, activeSet, output } = step.eventSets;

    // Canonicalize status strings and sort items consistently
    const canonicalOrder = [
      "pending",
      "current",
      "active",
      "new",
      "processed",
      "kept",
      "completed",
      "rejected",
    ];
    const normalizeStatus = (s) => {
      switch ((s || "").toLowerCase()) {
        case "pending":
          return "pending";
        case "current":
          return "current";
        case "active":
          return "active";
        case "new":
          return "new";
        case "processed":
        case "done":
        case "finished":
          return "processed";
        case "kept":
          return "kept";
        case "completed":
        case "complete":
          return "completed";
        case "accepted":
          return "processed"; // Map to processed for unified look
        case "intersecting":
          return "current";
        case "candidate":
        case "testing":
          return "current";
        case "rejected":
        case "removed":
          return "rejected";
        default:
          return "pending";
      }
    };

    const sortByStatusThenLabel = (a, b) => {
      const sa = canonicalOrder.indexOf(normalizeStatus(a.status));
      const sb = canonicalOrder.indexOf(normalizeStatus(b.status));
      if (sa !== sb) return sa - sb;
      const la = (a.label || "").toString();
      const lb = (b.label || "").toString();
      return la.localeCompare(lb);
    };

    const makeGroup = (titleText) => {
      const div = document.createElement("div");
      div.className = "event-group";
      const title = document.createElement("h4");
      title.textContent = titleText;
      div.appendChild(title);
      const list = document.createElement("ul");
      list.className = "event-list";
      div.appendChild(list);
      return { div, list };
    };

    const applyStatusClass = (li, status) => {
      switch (normalizeStatus(status)) {
        case "processed":
          li.classList.add("event-processed");
          break;
        case "current":
          li.classList.add("event-current");
          break;
        case "active":
          li.classList.add("event-accepted");
          break;
        case "rejected":
          li.classList.add("event-rejected");
          break;
        case "completed":
          li.classList.add("event-completed");
          break;
        case "new":
          li.classList.add("event-current");
          break;
        case "kept":
          li.classList.add("event-processed");
          break;
        default:
          li.classList.add("event-pending");
      }
    };

    const describeItem = (item) => {
      if (!item) return "";
      if (item.label) return item.label;
      // Try common shapes
      if (
        item.type &&
        item.x !== undefined &&
        item.segmentIndex !== undefined
      ) {
        return `${item.type.toUpperCase()} seg ${item.segmentIndex + 1} at x=${
          item.x.toFixed ? item.x.toFixed(1) : item.x
        }`;
      }
      if (item.type && item.x !== undefined && item.index !== undefined) {
        return `${item.type.toUpperCase()} rect ${item.index + 1} at x=${
          item.x.toFixed ? item.x.toFixed(1) : item.x
        }`;
      }
      if (item.interval) {
        const s =
          item.interval.start !== undefined
            ? item.interval.start
            : item.interval[0];
        const e =
          item.interval.end !== undefined
            ? item.interval.end
            : item.interval[1];
        return `I[${Number(s).toFixed ? Number(s).toFixed(1) : s}, ${
          Number(e).toFixed ? Number(e).toFixed(1) : e
        }]`;
      }
      if (item.node && item.node.l !== undefined && item.node.r !== undefined) {
        return `Node [${item.node.l}, ${item.node.r}]`;
      }
      if (item.median !== undefined) {
        return `Node at median ${item.median}`;
      }
      if (
        item.point &&
        item.point.x !== undefined &&
        item.point.y !== undefined
      ) {
        return `P(${item.point.x.toFixed(1)}, ${item.point.y.toFixed(1)})`;
      }
      if (
        item.area !== undefined &&
        item.width !== undefined &&
        item.height !== undefined
      ) {
        return `Contribution: ${item.width.toFixed(1)} × ${item.height.toFixed(
          1
        )} = ${item.area.toFixed(1)}`;
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    };

    if (Array.isArray(eventQueue) && eventQueue.length) {
      const { div, list } = makeGroup("Event Queue");
      eventQueue
        .slice()
        .sort(sortByStatusThenLabel)
        .forEach((ev) => {
          const li = document.createElement("li");
          li.textContent = describeItem(ev);
          applyStatusClass(li, ev.status);
          list.appendChild(li);
        });
      this.eventSetsEl.appendChild(div);
    }

    if (Array.isArray(activeSet) && activeSet.length) {
      const { div, list } = makeGroup("Active Set");
      activeSet
        .slice()
        .sort(sortByStatusThenLabel)
        .forEach((it) => {
          const li = document.createElement("li");
          li.textContent = describeItem(it);
          applyStatusClass(li, it.status || "active");
          list.appendChild(li);
        });
      this.eventSetsEl.appendChild(div);
    }

    if (Array.isArray(output) && output.length) {
      const { div, list } = makeGroup("Output");
      output
        .slice()
        .sort(sortByStatusThenLabel)
        .forEach((out) => {
          const li = document.createElement("li");
          li.textContent = describeItem(out);
          applyStatusClass(li, out.status || "completed");
          list.appendChild(li);
        });
      this.eventSetsEl.appendChild(div);
    }
  }

  // Updates for specific algorithms' event sets
  updateSegmentTreeEvents(step, algorithm) {
    // Intervals list
    if (step.eventSets && step.eventSets.intervals) {
      const intervalsDiv = document.createElement("div");
      intervalsDiv.className = "event-group";
      const title = document.createElement("h4");
      title.textContent = "Intervals";
      intervalsDiv.appendChild(title);
      const list = document.createElement("ul");
      list.className = "event-list";
      step.eventSets.intervals.forEach((iv) => {
        const li = document.createElement("li");
        li.textContent = `I${iv.index + 1}: [${iv.interval.start.toFixed(
          1
        )}, ${iv.interval.end.toFixed(1)}]`;
        switch (iv.status) {
          case "processed":
            li.classList.add("event-processed");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-pending");
        }
        list.appendChild(li);
      });
      intervalsDiv.appendChild(list);
      this.eventSetsEl.appendChild(intervalsDiv);
    }

    // Nodes covered in current assignment step
    if (step.eventSets && step.eventSets.nodes && step.eventSets.nodes.length) {
      const nodesDiv = document.createElement("div");
      nodesDiv.className = "event-group";
      const title = document.createElement("h4");
      title.textContent = "Covered Nodes";
      nodesDiv.appendChild(title);
      const list = document.createElement("ul");
      list.className = "event-list";
      step.eventSets.nodes.forEach((nd) => {
        const li = document.createElement("li");
        li.textContent = `Node [${nd.node.l}, ${nd.node.r}]`;
        li.classList.add("event-accepted");
        list.appendChild(li);
      });
      nodesDiv.appendChild(list);
      this.eventSetsEl.appendChild(nodesDiv);
    }
  }

  updateGrahamScanEvents(step, algorithm) {
    if (!step || !algorithm.points.length) return;

    // Points processing section
    const eventsDiv = document.createElement("div");
    eventsDiv.className = "event-group";

    const title = document.createElement("h4");
    title.textContent = "Points Processing";
    eventsDiv.appendChild(title);

    const eventList = document.createElement("ul");
    eventList.className = "event-list";

    if (step.eventSets && step.eventSets.points) {
      step.eventSets.points.forEach((pointData, index) => {
        const li = document.createElement("li");
        const point = pointData.point;
        let text = `Point ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;

        if (pointData.angle !== undefined && pointData.angle > 0) {
          text += ` [angle: ${((pointData.angle * 180) / Math.PI).toFixed(
            1
          )}°]`;
        }

        li.textContent = text;

        // Apply status-based styling
        switch (pointData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "rejected":
            li.classList.add("event-rejected");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          case "processed":
            li.classList.add("event-processed");
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });
    }

    eventsDiv.appendChild(eventList);
    this.eventSetsEl.appendChild(eventsDiv);

    // Show backtrack indicator if applicable
    if (step.isBacktrack) {
      const backtrackDiv = document.createElement("div");
      backtrackDiv.className = "event-group";
      backtrackDiv.style.backgroundColor = "rgba(155, 89, 182, 0.3)";

      const backtrackTitle = document.createElement("h4");
      backtrackTitle.textContent = "⬅ Backtracking";
      backtrackTitle.style.color = "#9b59b6";
      backtrackDiv.appendChild(backtrackTitle);

      const backtrackText = document.createElement("p");
      backtrackText.textContent =
        "Algorithm detected clockwise turn and removed point from hull";
      backtrackText.style.fontSize = "0.8em";
      backtrackText.style.color = "#9b59b6";
      backtrackDiv.appendChild(backtrackText);

      this.eventSetsEl.appendChild(backtrackDiv);
    }
  }

  updateLineSweepEvents(step, algorithm) {
    if (!step || !algorithm.segments.length) return;

    // Sweep Events section
    if (step.eventSets && step.eventSets.events) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const title = document.createElement("h4");
      title.textContent = "Sweep Events";
      eventsDiv.appendChild(title);

      const eventList = document.createElement("ul");
      eventList.className = "event-list";

      step.eventSets.events.forEach((event) => {
        const li = document.createElement("li");
        li.textContent = event.description;

        // Apply status-based styling
        switch (event.status) {
          case "processed":
            li.classList.add("event-processed");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });

      eventsDiv.appendChild(eventList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Segments section
    if (step.eventSets && step.eventSets.segments) {
      const segmentsDiv = document.createElement("div");
      segmentsDiv.className = "event-group";

      const segmentsTitle = document.createElement("h4");
      segmentsTitle.textContent = "Line Segments";
      segmentsDiv.appendChild(segmentsTitle);

      const segmentsList = document.createElement("ul");
      segmentsList.className = "event-list";

      step.eventSets.segments.forEach((segData) => {
        const li = document.createElement("li");
        const seg = segData.segment;
        li.textContent = `Segment ${segData.index + 1}: (${seg.p1.x.toFixed(
          1
        )}, ${seg.p1.y.toFixed(1)}) → (${seg.p2.x.toFixed(
          1
        )}, ${seg.p2.y.toFixed(1)})`;

        // Apply status-based styling
        switch (segData.status) {
          case "active":
            li.classList.add("event-accepted");
            break;
          case "intersecting":
            li.classList.add("event-current");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          case "processed":
            li.classList.add("event-processed");
            break;
          default:
            li.classList.add("event-pending");
        }

        segmentsList.appendChild(li);
      });

      segmentsDiv.appendChild(segmentsList);
      this.eventSetsEl.appendChild(segmentsDiv);
    }

    // Intersections section
    if (step.intersections && step.intersections.length > 0) {
      const intersectionsDiv = document.createElement("div");
      intersectionsDiv.className = "event-group";

      const intersectionsTitle = document.createElement("h4");
      intersectionsTitle.textContent = "Intersections Found";
      intersectionsDiv.appendChild(intersectionsTitle);

      const intersectionsList = document.createElement("ul");
      intersectionsList.className = "event-list";

      step.intersections.forEach((intersection, index) => {
        const li = document.createElement("li");
        let text = `Intersection ${index + 1}: (${intersection.x.toFixed(
          1
        )}, ${intersection.y.toFixed(1)})`;

        if (intersection.segments) {
          text += ` [segments ${intersection.segments[0] + 1} & ${
            intersection.segments[1] + 1
          }]`;
        }

        li.textContent = text;
        li.classList.add("event-accepted");
        intersectionsList.appendChild(li);
      });

      intersectionsDiv.appendChild(intersectionsList);
      this.eventSetsEl.appendChild(intersectionsDiv);
    }
  }

  updateTriangulationEvents(step, algorithm) {
    if (!step || !step.polygon.vertices.length) return;

    // Vertices section
    if (step.eventSets && step.eventSets.vertices) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const title = document.createElement("h4");
      title.textContent = "Vertices Status";
      eventsDiv.appendChild(title);

      const eventList = document.createElement("ul");
      eventList.className = "event-list";

      step.eventSets.vertices.forEach((vertexData) => {
        const li = document.createElement("li");
        const vertex = vertexData.vertex;
        let text = `Vertex ${
          typeof vertexData.index === "string"
            ? vertexData.index
            : vertexData.index + 1
        }: (${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)})`;

        if (vertexData.isEar !== undefined) {
          text += vertexData.isEar ? " [ear]" : " [not ear]";
        }

        li.textContent = text;

        // Apply status-based styling
        switch (vertexData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "rejected":
            li.classList.add("event-rejected");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          case "processed":
            li.classList.add("event-processed");
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });

      eventsDiv.appendChild(eventList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Triangles section
    if (
      step.eventSets &&
      step.eventSets.triangles &&
      step.eventSets.triangles.length > 0
    ) {
      const trianglesDiv = document.createElement("div");
      trianglesDiv.className = "event-group";

      const trianglesTitle = document.createElement("h4");
      trianglesTitle.textContent = "Triangles";
      trianglesDiv.appendChild(trianglesTitle);

      const trianglesList = document.createElement("ul");
      trianglesList.className = "event-list";

      step.eventSets.triangles.forEach((triangleData) => {
        const li = document.createElement("li");
        li.textContent = `Triangle ${triangleData.index + 1}`;

        // Apply status-based styling
        switch (triangleData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-processed");
        }

        trianglesList.appendChild(li);
      });

      trianglesDiv.appendChild(trianglesList);
      this.eventSetsEl.appendChild(trianglesDiv);
    }
  }

  updateGiftWrapEvents(step, algorithm) {
    if (!step || !algorithm.points.length) return;

    // Points processing section
    const eventsDiv = document.createElement("div");
    eventsDiv.className = "event-group";

    const title = document.createElement("h4");
    title.textContent = "Points Processing";
    eventsDiv.appendChild(title);

    const eventList = document.createElement("ul");
    eventList.className = "event-list";

    if (step.eventSets && step.eventSets.points) {
      step.eventSets.points.forEach((pointData, index) => {
        const li = document.createElement("li");
        const point = pointData.point;
        let text = `Point ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;

        li.textContent = text;

        // Apply status-based styling
        switch (pointData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "rejected":
            li.classList.add("event-rejected");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          case "candidate":
            li.classList.add("event-current");
            li.textContent += " [candidate]";
            break;
          case "testing":
            li.classList.add("event-backtrack");
            li.textContent += " [testing]";
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });
    }

    eventsDiv.appendChild(eventList);
    this.eventSetsEl.appendChild(eventsDiv);

    // Hull progress section
    if (step.hull && step.hull.length > 0) {
      const hullDiv = document.createElement("div");
      hullDiv.className = "event-group";

      const hullTitle = document.createElement("h4");
      hullTitle.textContent = "Hull Progress";
      hullDiv.appendChild(hullTitle);

      const hullList = document.createElement("ul");
      hullList.className = "event-list";

      step.hull.forEach((point, index) => {
        const li = document.createElement("li");
        li.textContent = `Hull Point ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;
        li.classList.add("event-accepted");
        hullList.appendChild(li);
      });

      hullDiv.appendChild(hullList);
      this.eventSetsEl.appendChild(hullDiv);
    }
  }

  updateQuickHullEvents(step, algorithm) {
    if (!step || !algorithm.points.length) return;

    // Points processing section
    const eventsDiv = document.createElement("div");
    eventsDiv.className = "event-group";

    const title = document.createElement("h4");
    title.textContent = "Points Processing";
    eventsDiv.appendChild(title);

    const eventList = document.createElement("ul");
    eventList.className = "event-list";

    if (step.eventSets && step.eventSets.points) {
      step.eventSets.points.forEach((pointData, index) => {
        const li = document.createElement("li");
        const point = pointData.point;
        let text = `Point ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;

        li.textContent = text;

        // Apply status-based styling
        switch (pointData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "rejected":
            li.classList.add("event-rejected");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          case "upper":
            li.classList.add("event-processed");
            li.textContent += " [upper set]";
            break;
          case "lower":
            li.classList.add("event-processed");
            li.textContent += " [lower set]";
            break;
          case "left":
            li.classList.add("event-pending");
            li.textContent += " [left subset]";
            break;
          case "right":
            li.classList.add("event-pending");
            li.textContent += " [right subset]";
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });
    }

    eventsDiv.appendChild(eventList);
    this.eventSetsEl.appendChild(eventsDiv);

    // Hull progress section
    if (step.hull && step.hull.length > 0) {
      const hullDiv = document.createElement("div");
      hullDiv.className = "event-group";

      const hullTitle = document.createElement("h4");
      hullTitle.textContent = "Hull Progress";
      hullDiv.appendChild(hullTitle);

      const hullList = document.createElement("ul");
      hullList.className = "event-list";

      step.hull.forEach((point, index) => {
        const li = document.createElement("li");
        li.textContent = `Hull Point ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;
        li.classList.add("event-accepted");
        hullList.appendChild(li);
      });

      hullDiv.appendChild(hullList);
      this.eventSetsEl.appendChild(hullDiv);
    }

    // Show division information
    if (step.upperSet && step.upperSet.length > 0) {
      const upperDiv = document.createElement("div");
      upperDiv.className = "event-group";
      upperDiv.style.backgroundColor = "rgba(100, 150, 255, 0.2)";

      const upperTitle = document.createElement("h4");
      upperTitle.textContent = `Upper Set (${step.upperSet.length} points)`;
      upperTitle.style.color = "#4682b4";
      upperDiv.appendChild(upperTitle);

      this.eventSetsEl.appendChild(upperDiv);
    }

    if (step.lowerSet && step.lowerSet.length > 0) {
      const lowerDiv = document.createElement("div");
      lowerDiv.className = "event-group";
      lowerDiv.style.backgroundColor = "rgba(255, 150, 100, 0.2)";

      const lowerTitle = document.createElement("h4");
      lowerTitle.textContent = `Lower Set (${step.lowerSet.length} points)`;
      lowerTitle.style.color = "#cd853f";
      lowerDiv.appendChild(lowerTitle);

      this.eventSetsEl.appendChild(lowerDiv);
    }
  }

  updateDelaunayEvents(step, algorithm) {
    if (!step || !algorithm.points.length) return;

    // Points section
    if (step.eventSets && step.eventSets.points) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const title = document.createElement("h4");
      title.textContent = "Points Processing";
      eventsDiv.appendChild(title);

      const eventList = document.createElement("ul");
      eventList.className = "event-list";

      step.eventSets.points.forEach((pointData) => {
        const li = document.createElement("li");
        const point = pointData.point;
        li.textContent = `Point ${pointData.index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;

        // Apply status-based styling
        switch (pointData.status) {
          case "processed":
            li.classList.add("event-processed");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });

      eventsDiv.appendChild(eventList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Triangles section
    if (
      step.eventSets &&
      step.eventSets.triangles &&
      step.eventSets.triangles.length > 0
    ) {
      const trianglesDiv = document.createElement("div");
      trianglesDiv.className = "event-group";

      const trianglesTitle = document.createElement("h4");
      trianglesTitle.textContent = "Triangles";
      trianglesDiv.appendChild(trianglesTitle);

      const trianglesList = document.createElement("ul");
      trianglesList.className = "event-list";

      step.eventSets.triangles.forEach((triangleData) => {
        const li = document.createElement("li");
        li.textContent =
          triangleData.description ||
          `Triangle ${
            typeof triangleData.index === "string"
              ? triangleData.index
              : triangleData.index + 1
          }`;

        // Apply status-based styling
        switch (triangleData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "rejected":
            li.classList.add("event-rejected");
            break;
          case "active":
            li.classList.add("event-processed");
            break;
          case "super":
            li.classList.add("event-pending");
            li.style.fontStyle = "italic";
            break;
          default:
            li.classList.add("event-processed");
        }

        trianglesList.appendChild(li);
      });

      trianglesDiv.appendChild(trianglesList);
      this.eventSetsEl.appendChild(trianglesDiv);
    }
  }

  updateVoronoiEvents(step, algorithm) {
    if (!step || !algorithm.points.length) return;

    // Points section
    if (step.eventSets && step.eventSets.points) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const title = document.createElement("h4");
      title.textContent = "Sites (Points)";
      eventsDiv.appendChild(title);

      const eventList = document.createElement("ul");
      eventList.className = "event-list";

      step.eventSets.points.forEach((pointData, index) => {
        const li = document.createElement("li");
        const point = pointData.point;
        li.textContent = `Site ${index + 1}: (${point.x.toFixed(
          1
        )}, ${point.y.toFixed(1)})`;

        // Apply status-based styling
        switch (pointData.status) {
          case "processed":
            li.classList.add("event-processed");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-pending");
        }

        eventList.appendChild(li);
      });

      eventsDiv.appendChild(eventList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Circumcenters section
    if (
      step.eventSets &&
      step.eventSets.circumcenters &&
      step.eventSets.circumcenters.length > 0
    ) {
      const circumcentersDiv = document.createElement("div");
      circumcentersDiv.className = "event-group";

      const circumcentersTitle = document.createElement("h4");
      circumcentersTitle.textContent = "Voronoi Vertices (Circumcenters)";
      circumcentersDiv.appendChild(circumcentersTitle);

      const circumcentersList = document.createElement("ul");
      circumcentersList.className = "event-list";

      step.eventSets.circumcenters.forEach((centerData, index) => {
        const li = document.createElement("li");
        const center = centerData.point;
        li.textContent = `Vertex ${index + 1}: (${center.x.toFixed(
          1
        )}, ${center.y.toFixed(1)})`;

        // Apply status-based styling
        switch (centerData.status) {
          case "current":
            li.classList.add("event-current");
            break;
          case "processed":
            li.classList.add("event-processed");
            break;
          default:
            li.classList.add("event-pending");
        }

        circumcentersList.appendChild(li);
      });

      circumcentersDiv.appendChild(circumcentersList);
      this.eventSetsEl.appendChild(circumcentersDiv);
    }

    // Voronoi cells section
    if (
      step.eventSets &&
      step.eventSets.cells &&
      step.eventSets.cells.length > 0
    ) {
      const cellsDiv = document.createElement("div");
      cellsDiv.className = "event-group";

      const cellsTitle = document.createElement("h4");
      cellsTitle.textContent = "Voronoi Cells";
      cellsDiv.appendChild(cellsTitle);

      const cellsList = document.createElement("ul");
      cellsList.className = "event-list";

      step.eventSets.cells.forEach((cellData, index) => {
        const li = document.createElement("li");
        const cell = cellData.cell;
        const vertexCount = cell.vertices ? cell.vertices.length : 0;
        li.textContent = `Cell ${index + 1}: ${vertexCount} vertices`;

        // Apply status-based styling
        switch (cellData.status) {
          case "accepted":
            li.classList.add("event-accepted");
            break;
          case "current":
            li.classList.add("event-current");
            break;
          default:
            li.classList.add("event-processed");
        }

        cellsList.appendChild(li);
      });

      cellsDiv.appendChild(cellsList);
      this.eventSetsEl.appendChild(cellsDiv);
    }

    // Duality information
    if (step.showDuality) {
      const dualityDiv = document.createElement("div");
      dualityDiv.className = "event-group";
      dualityDiv.style.backgroundColor = "rgba(0, 0, 200, 0.1)";

      const dualityTitle = document.createElement("h4");
      dualityTitle.textContent = "Duality Visualization Active";
      dualityTitle.style.color = "#0000cc";
      dualityDiv.appendChild(dualityTitle);

      const dualityText = document.createElement("p");
      dualityText.innerHTML =
        "• Delaunay triangulation shown in blue<br>• Voronoi vertices are Delaunay circumcenters<br>• Voronoi edges connect circumcenters";
      dualityText.style.fontSize = "0.9em";
      dualityDiv.appendChild(dualityText);

      this.eventSetsEl.appendChild(dualityDiv);
    }
  }

  updateRectangleUnionEvents(step, algorithm) {
    if (!step || !algorithm.rectangles.length) return;

    // Rectangles section
    const rectanglesDiv = document.createElement("div");
    rectanglesDiv.className = "event-group";

    const rectanglesTitle = document.createElement("h4");
    rectanglesTitle.textContent = "Rectangles";
    rectanglesDiv.appendChild(rectanglesTitle);

    const rectanglesList = document.createElement("ul");
    rectanglesList.className = "event-list";

    if (step.eventSets && step.eventSets.rectangles) {
      step.eventSets.rectangles.forEach((rectData, index) => {
        const li = document.createElement("li");
        const rect = rectData.rectangle;
        let text = `Rectangle ${index + 1}: (${rect.x1.toFixed(
          1
        )}, ${rect.y1.toFixed(1)}) to (${rect.x2.toFixed(1)}, ${rect.y2.toFixed(
          1
        )}) [Area: ${rect.area.toFixed(1)}]`;

        li.textContent = text;
        li.className = `event-${rectData.status}`;
        rectanglesList.appendChild(li);
      });
    }

    rectanglesDiv.appendChild(rectanglesList);
    this.eventSetsEl.appendChild(rectanglesDiv);

    // Events section
    if (
      step.eventSets &&
      step.eventSets.events &&
      step.eventSets.events.length > 0
    ) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const eventsTitle = document.createElement("h4");
      eventsTitle.textContent = "Sweep Events";
      eventsDiv.appendChild(eventsTitle);

      const eventsList = document.createElement("ul");
      eventsList.className = "event-list";

      step.eventSets.events.forEach((eventData, index) => {
        const li = document.createElement("li");
        const event = eventData.event;
        let text = `${event.type.toUpperCase()} at x=${event.x.toFixed(
          1
        )} (Rectangle ${event.index + 1})`;

        li.textContent = text;
        li.className = `event-${eventData.status}`;
        eventsList.appendChild(li);
      });

      eventsDiv.appendChild(eventsList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Active rectangles section
    if (step.activeRectangles && step.activeRectangles.length > 0) {
      const activeDiv = document.createElement("div");
      activeDiv.className = "event-group";

      const activeTitle = document.createElement("h4");
      activeTitle.textContent = "Active Rectangles";
      activeDiv.appendChild(activeTitle);

      const activeList = document.createElement("ul");
      activeList.className = "event-list";

      step.activeRectangles.forEach((rect, index) => {
        const li = document.createElement("li");
        const rectIndex = algorithm.rectangles.indexOf(rect) + 1;
        let text = `Rectangle ${rectIndex}: Y-range [${rect.y1.toFixed(
          1
        )}, ${rect.y2.toFixed(1)}]`;

        li.textContent = text;
        li.className = "event-active";
        activeList.appendChild(li);
      });

      activeDiv.appendChild(activeList);
      this.eventSetsEl.appendChild(activeDiv);
    }

    // Area calculation section
    if (step.totalArea > 0) {
      const areaDiv = document.createElement("div");
      areaDiv.className = "event-group";

      const areaTitle = document.createElement("h4");
      areaTitle.textContent = "Area Calculation";
      areaDiv.appendChild(areaTitle);

      const areaList = document.createElement("ul");
      areaList.className = "event-list";

      const totalLi = document.createElement("li");
      totalLi.textContent = `Total Union Area: ${step.totalArea.toFixed(1)}`;
      totalLi.className = "event-completed";
      areaList.appendChild(totalLi);

      if (step.currentArea > 0) {
        const currentLi = document.createElement("li");
        currentLi.textContent = `Current Contribution: ${step.currentArea.toFixed(
          1
        )}`;
        currentLi.className = "event-current";
        areaList.appendChild(currentLi);
      }

      areaDiv.appendChild(areaList);
      this.eventSetsEl.appendChild(areaDiv);
    }
  }

  updateRectangleIntersectionEvents(step, algorithm) {
    if (!step || !algorithm.rectangles.length) return;

    // Rectangles section
    const rectanglesDiv = document.createElement("div");
    rectanglesDiv.className = "event-group";

    const rectanglesTitle = document.createElement("h4");
    rectanglesTitle.textContent = "Rectangles";
    rectanglesDiv.appendChild(rectanglesTitle);

    const rectanglesList = document.createElement("ul");
    rectanglesList.className = "event-list";

    if (step.eventSets && step.eventSets.rectangles) {
      step.eventSets.rectangles.forEach((rectData, index) => {
        const li = document.createElement("li");
        const rect = rectData.rectangle;
        let text = `Rectangle ${index + 1}: (${rect.x1.toFixed(
          1
        )}, ${rect.y1.toFixed(1)}) to (${rect.x2.toFixed(1)}, ${rect.y2.toFixed(
          1
        )}) [Area: ${rect.area.toFixed(1)}]`;

        li.textContent = text;
        li.className = `event-${rectData.status}`;
        rectanglesList.appendChild(li);
      });
    }

    rectanglesDiv.appendChild(rectanglesList);
    this.eventSetsEl.appendChild(rectanglesDiv);

    // Events section
    if (
      step.eventSets &&
      step.eventSets.events &&
      step.eventSets.events.length > 0
    ) {
      const eventsDiv = document.createElement("div");
      eventsDiv.className = "event-group";

      const eventsTitle = document.createElement("h4");
      eventsTitle.textContent = "Sweep Events";
      eventsDiv.appendChild(eventsTitle);

      const eventsList = document.createElement("ul");
      eventsList.className = "event-list";

      step.eventSets.events.forEach((eventData, index) => {
        const li = document.createElement("li");
        const event = eventData.event;
        let text = `${event.type.toUpperCase()} at x=${event.x.toFixed(
          1
        )} (Rectangle ${event.index + 1})`;

        li.textContent = text;
        li.className = `event-${eventData.status}`;
        eventsList.appendChild(li);
      });

      eventsDiv.appendChild(eventsList);
      this.eventSetsEl.appendChild(eventsDiv);
    }

    // Active rectangles section
    if (step.activeRectangles && step.activeRectangles.length > 0) {
      const activeDiv = document.createElement("div");
      activeDiv.className = "event-group";

      const activeTitle = document.createElement("h4");
      activeTitle.textContent = "Active Rectangles";
      activeDiv.appendChild(activeTitle);

      const activeList = document.createElement("ul");
      activeList.className = "event-list";

      step.activeRectangles.forEach((rect, index) => {
        const li = document.createElement("li");
        const rectIndex = algorithm.rectangles.indexOf(rect) + 1;
        let text = `Rectangle ${rectIndex}: Y-range [${rect.y1.toFixed(
          1
        )}, ${rect.y2.toFixed(1)}]`;

        li.textContent = text;
        li.className = "event-active";
        activeList.appendChild(li);
      });

      activeDiv.appendChild(activeList);
      this.eventSetsEl.appendChild(activeDiv);
    }

    // Intersection regions section
    if (step.intersectionRegions && step.intersectionRegions.length > 0) {
      const intersectionDiv = document.createElement("div");
      intersectionDiv.className = "event-group";

      const intersectionTitle = document.createElement("h4");
      intersectionTitle.textContent = "Intersection Regions";
      intersectionDiv.appendChild(intersectionTitle);

      const intersectionList = document.createElement("ul");
      intersectionList.className = "event-list";

      step.intersectionRegions.forEach((region, index) => {
        const li = document.createElement("li");
        const width = region.x2 - region.x1;
        const height = region.y2 - region.y1;
        const area = width * height;
        let text = `Region ${index + 1}: ${width.toFixed(1)} × ${height.toFixed(
          1
        )} = ${area.toFixed(1)}`;

        li.textContent = text;
        li.className = "event-current";
        intersectionList.appendChild(li);
      });

      intersectionDiv.appendChild(intersectionList);
      this.eventSetsEl.appendChild(intersectionDiv);
    }

    // Area calculation section
    if (step.totalArea > 0) {
      const areaDiv = document.createElement("div");
      areaDiv.className = "event-group";

      const areaTitle = document.createElement("h4");
      areaTitle.textContent = "Area Calculation";
      areaDiv.appendChild(areaTitle);

      const areaList = document.createElement("ul");
      areaList.className = "event-list";

      const totalLi = document.createElement("li");
      totalLi.textContent = `Total Intersection Area: ${step.totalArea.toFixed(
        1
      )}`;
      totalLi.className = "event-completed";
      areaList.appendChild(totalLi);

      if (step.currentArea > 0) {
        const currentLi = document.createElement("li");
        currentLi.textContent = `Current Contribution: ${step.currentArea.toFixed(
          1
        )}`;
        currentLi.className = "event-current";
        areaList.appendChild(currentLi);
      }

      areaDiv.appendChild(areaList);
      this.eventSetsEl.appendChild(areaDiv);
    }
  }

  updateArtGalleryEvents(step, algorithm) {
    if (!step) return;

    // Polygon Information Section
    if (step.eventSets && step.eventSets.polygon) {
      const polygonDiv = document.createElement("div");
      polygonDiv.className = "event-group";

      const polygonTitle = document.createElement("h4");
      polygonTitle.textContent = "Polygon Information";
      polygonDiv.appendChild(polygonTitle);

      const polygonList = document.createElement("ul");
      polygonList.className = "event-list";

      const polygonInfo = step.eventSets.polygon;
      const li1 = document.createElement("li");
      li1.textContent = `Vertices: ${polygonInfo.vertices}`;
      li1.className = "event-completed";
      polygonList.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Area: ${polygonInfo.area}`;
      li2.className = "event-completed";
      polygonList.appendChild(li2);

      const li3 = document.createElement("li");
      li3.textContent = `Perimeter: ${polygonInfo.perimeter}`;
      li3.className = "event-completed";
      polygonList.appendChild(li3);

      polygonDiv.appendChild(polygonList);
      this.eventSetsEl.appendChild(polygonDiv);
    }

    // Triangulation Section
    if (step.eventSets && step.eventSets.triangulation) {
      const triangulationDiv = document.createElement("div");
      triangulationDiv.className = "event-group";

      const triangulationTitle = document.createElement("h4");
      triangulationTitle.textContent = "Triangulation";
      triangulationDiv.appendChild(triangulationTitle);

      const triangulationList = document.createElement("ul");
      triangulationList.className = "event-list";

      const triangulationInfo = step.eventSets.triangulation;
      const li1 = document.createElement("li");
      li1.textContent = `Triangles: ${triangulationInfo.triangles}`;
      li1.className = "event-completed";
      triangulationList.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Method: ${triangulationInfo.method}`;
      li2.className = "event-completed";
      triangulationList.appendChild(li2);

      triangulationDiv.appendChild(triangulationList);
      this.eventSetsEl.appendChild(triangulationDiv);
    }

    // Coloring Section
    if (step.eventSets && step.eventSets.coloring) {
      const coloringDiv = document.createElement("div");
      coloringDiv.className = "event-group";

      const coloringTitle = document.createElement("h4");
      coloringTitle.textContent = "3-Coloring";
      coloringDiv.appendChild(coloringTitle);

      const coloringList = document.createElement("ul");
      coloringList.className = "event-list";

      const coloringInfo = step.eventSets.coloring;
      coloringInfo.colors.forEach((color, index) => {
        const li = document.createElement("li");
        li.textContent = `Color ${index + 1}: ${color}`;
        li.className = "event-completed";
        coloringList.appendChild(li);
      });

      const li = document.createElement("li");
      li.textContent = `Total vertices: ${coloringInfo.vertices}`;
      li.className = "event-completed";
      coloringList.appendChild(li);

      coloringDiv.appendChild(coloringList);
      this.eventSetsEl.appendChild(coloringDiv);
    }

    // Guards Section
    if (step.eventSets && step.eventSets.guards) {
      const guardsDiv = document.createElement("div");
      guardsDiv.className = "event-group";

      const guardsTitle = document.createElement("h4");
      guardsTitle.textContent = "Guard Placement";
      guardsDiv.appendChild(guardsTitle);

      const guardsList = document.createElement("ul");
      guardsList.className = "event-list";

      const guardsInfo = step.eventSets.guards;
      const li1 = document.createElement("li");
      li1.textContent = `Guards needed: ${guardsInfo.count}`;
      li1.className = "event-completed";
      guardsList.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Art Gallery Theorem: ${guardsInfo.theorem}`;
      li2.className = "event-completed";
      guardsList.appendChild(li2);

      guardsDiv.appendChild(guardsList);
      this.eventSetsEl.appendChild(guardsDiv);
    }

    // Visibility Section
    if (step.eventSets && step.eventSets.visibility) {
      const visibilityDiv = document.createElement("div");
      visibilityDiv.className = "event-group";

      const visibilityTitle = document.createElement("h4");
      visibilityTitle.textContent = "Visibility Analysis";
      visibilityDiv.appendChild(visibilityTitle);

      const visibilityList = document.createElement("ul");
      visibilityList.className = "event-list";

      const visibilityInfo = step.eventSets.visibility;
      const li1 = document.createElement("li");
      li1.textContent = `Coverage: ${visibilityInfo.coverage}`;
      li1.className = "event-completed";
      visibilityList.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Active guards: ${visibilityInfo.guards}`;
      li2.className = "event-completed";
      visibilityList.appendChild(li2);

      visibilityDiv.appendChild(visibilityList);
      this.eventSetsEl.appendChild(visibilityDiv);
    }
  }
}

// NOTE: Mobile bottom-sheet: moves .control-overlay and #top-left-overlay into
// a single fixed, scrollable sheet on small screens (<=640px). Restores them
// to their original positions on larger screens.
(function () {
  const MOBILE_WIDTH = 640;
  const sheetId = "mobile-bottom-sheet";
  let sheet = null;
  let originalParent = null;
  let originalTopLeftParent = null;
  let moved = false;

  function createSheet() {
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.id = sheetId;
    sheet.className = "mobile-bottom-sheet";
    sheet.setAttribute("role", "region");
    sheet.setAttribute("aria-label", "Controls and panels");

    // Header: small handle, toggle (expand/collapse) button
    const header = document.createElement("div");
    header.className = "sheet-header";

    const handle = document.createElement("div");
    handle.className = "sheet-handle";
    handle.setAttribute("aria-hidden", "true");
    header.appendChild(handle);

    const headerButtons = document.createElement("div");
    headerButtons.className = "sheet-header-buttons";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "sheet-toggle-btn";
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "Expand controls");
    toggleBtn.innerHTML =
      '<i data-lucide="chevron-up" class="toggle-icon" aria-hidden="true"></i>';

    headerButtons.appendChild(toggleBtn);
    header.appendChild(headerButtons);

    const content = document.createElement("div");
    content.className = "sheet-content";

    sheet.appendChild(header);
    sheet.appendChild(content);
    document.body.appendChild(sheet);

    // Render lucide icons
    try {
      lucide && lucide.createIcons && lucide.createIcons();
    } catch (e) {}

    // Wire toggle
    toggleBtn.addEventListener("click", (ev) => {
      const expanded = sheet.classList.toggle("expanded");
      toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
      // NOTE: Update heights at all places here, if CSS changes & vice-versa
      if (expanded) sheet.style.height = "72dvh";
      else sheet.style.height = "23.25dvh";
      // Toggle rotation class
      try {
        const icon = toggleBtn.querySelector(".toggle-icon");
        if (icon) {
          if (expanded) icon.classList.add("rotated");
          else icon.classList.remove("rotated");
        }
      } catch (e) {}
      // Re-render lucide icons, in case, dynamic SVG needs updating
      try {
        lucide && lucide.createIcons && lucide.createIcons();
      } catch (e) {}
      // keep focus on the toggle for keyboard users
      toggleBtn.focus();
      ev.stopPropagation();
    });

    // Esc collapses the sheet, when header has focus
    header.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        sheet.classList.remove("expanded");
        sheet.style.height = "23.25dvh";
        const toggle = sheet.querySelector(".sheet-toggle-btn");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    });

    // Ensures panel itself doesn't let clicks fall through to the canvas
    // but allow interactive controls inside the sheet to perform their
    // default actions (buttons/inputs).
    const stopHandler = (e) => {
      try {
        const target = e.target;
        const isInContent =
          target && target.closest && target.closest(".sheet-content");
        e.stopPropagation();
        const gestureEvents = ["wheel", "touchmove", "pointermove"];
        if (gestureEvents.indexOf(e.type) >= 0) {
          if (!isInContent) {
            e.preventDefault();
          } else {
            // pass - allow scrolling inside the sheet content
          }
          return;
        }

        // Disallow default for pointerdown, touchstart, mousedown
        if (
          e.type === "pointerdown" ||
          e.type === "touchstart" ||
          e.type === "mousedown"
        ) {
          const interactiveSelector =
            'button, input, select, textarea, label, [role="button"], a, .no-drag';
          const isInteractive =
            target && target.closest && target.closest(interactiveSelector);
          if (!isInteractive && !isInContent) {
            e.preventDefault();
          }
          return;
        }

        // For other non-gesture events (click, pointerup, etc.), allow defaults
      } catch (err) {
        e.stopPropagation();
        try {
          e.preventDefault();
        } catch (ignore) {}
      }
    };

    [
      "click",
      "pointerdown",
      "pointerup",
      "pointermove",
      "mousedown",
      "mouseup",
      "mousemove",
      "mouseover",
      "pointerover",
      "mouseenter",
      "pointerenter",
      "touchstart",
      "touchmove",
      "touchend",
      "wheel",
    ].forEach((evt) =>
      sheet.addEventListener(evt, stopHandler, { passive: false })
    );

    return sheet;
  }

  function moveIntoSheet() {
    if (moved) return;
    const control = document.getElementById("control-overlay");
    const topLeft = document.getElementById("top-left-overlays");
    if (!control && !topLeft) return;

    const s = createSheet();
    const content = s.querySelector(".sheet-content");

    // Cache original parents for later restore
    if (control && !originalParent) originalParent = control.parentNode;
    if (topLeft && !originalTopLeftParent)
      originalTopLeftParent = topLeft.parentNode;

    // Move control overlay into sheet (at top of sheet)
    if (control) content.appendChild(control);

    // Then move top-left overlays below controls
    if (topLeft) content.appendChild(topLeft);

    // Mark body so CSS can adjust, if needed
    document.body.classList.add("mobile-sheet-active");
    // Start collapsed
    const sEl = document.getElementById(sheetId);
    if (sEl) sEl.classList.remove("expanded");
    moved = true;
    attachDragHandlers();
  }

  function restoreFromSheet() {
    if (!moved) return;
    const control = document.getElementById("control-overlay");
    const topLeft = document.getElementById("top-left-overlays");
    const s = document.getElementById(sheetId);

    // Put elements back to their original parents at the end.
    if (control && originalParent) originalParent.appendChild(control);
    if (topLeft && originalTopLeftParent)
      originalTopLeftParent.appendChild(topLeft);

    // Remove sheet
    if (s && s.parentNode) s.parentNode.removeChild(s);
    sheet = null;
    document.body.classList.remove("mobile-sheet-active");
    detachDragHandlers();
    moved = false;
  }

  // Drag/gesture handling to let the user pull the sheet up/down
  let dragState = { dragging: false, startY: 0, startHeight: 0 };
  function attachDragHandlers() {
    const s = document.getElementById(sheetId);
    if (!s) return;
    // Prevent double-attachment
    if (s.__dragHandlersAttached) return;

    const onPointerDown = (ev) => {
      // Only left button or touch
      if (ev.type === "pointerdown" && ev.button && ev.button !== 0) return;
      // Only start a drag, when pointerdown is on the header (but not on header buttons)
      // or on the drag handle.
      const target = ev.target || ev;
      const header = s.querySelector(".sheet-header");
      const handleEl = s.querySelector(".sheet-handle");
      const headerButtons = s.querySelector(".sheet-header-buttons");

      // If the target is inside header buttons, do not start dragging - allow the button click
      if (
        headerButtons &&
        target.closest &&
        target.closest(".sheet-header-buttons")
      ) {
        return;
      }

      // If target is not in header and not on handle, don't start drag
      const isOnHandle =
        handleEl && target.closest && target.closest(".sheet-handle");
      const isOnHeader =
        header && target.closest && target.closest(".sheet-header");
      if (!isOnHandle && !isOnHeader) return;

      dragState.dragging = true;
      dragState.startY =
        ev.clientY || (ev.touches && ev.touches[0].clientY) || 0;
      dragState.startHeight = s.getBoundingClientRect().height;
      try {
        s.classList.add("dragging");
      } catch (e) {}
      s.setPointerCapture && s.setPointerCapture(ev.pointerId);
      // Disable CSS transitions, while dragging, for immediate response
      try {
        s.style.transition = "none";
      } catch (e) {}
      ev.preventDefault();
    };

    const onPointerMove = (ev) => {
      if (!dragState.dragging) return;
      const y = ev.clientY || (ev.touches && ev.touches[0].clientY) || 0;
      const delta = dragState.startY - y; // positive when dragging up
      const newHeight = Math.min(
        Math.max(dragState.startHeight + delta, 12),
        window.innerHeight * 0.9
      );
      // Apply inline height for transition to work
      s.style.height = newHeight + "px";
      ev.preventDefault();
    };

    const onPointerUp = (ev) => {
      if (!dragState.dragging) return;
      dragState.dragging = false;
      try {
        s.classList.remove("dragging");
      } catch (e) {}
      // Decide whether to expand based on final height
      const rect = s.getBoundingClientRect();
      const vh = window.innerHeight;
      // If more than 40% of viewport, expand; otherwise, collapse
      if (rect.height > vh * 0.4) {
        s.classList.add("expanded");
        s.style.height = "72dvh";
      } else {
        s.classList.remove("expanded");
        s.style.height = "23.25dvh";
      }
      // Restore the transition so CSS animations work again
      try {
        // Clear the inline transition to fall back to stylesheet transition
        s.style.transition = "";
      } catch (e) {}
      try {
        s.releasePointerCapture && s.releasePointerCapture(ev.pointerId);
      } catch (e) {}
      ev.preventDefault();
    };

    // Mobile/touch listeners
    s.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("pointerup", onPointerUp, {
      passive: false,
      capture: true,
    });

    // Touch fallback: attach the original touch events
    s.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchend", onPointerUp, {
      passive: false,
      capture: true,
    });

    s.__dragHandlersAttached = true;
  }

  function detachDragHandlers() {
    const s = document.getElementById(sheetId);
    if (!s || !s.__dragHandlersAttached) return;
    // Remove listeners by cloning the node (simple cleanup) and replacing it
    const clone = s.cloneNode(true);
    s.parentNode.replaceChild(clone, s);
  }

  function evaluateWindow() {
    try {
      const w = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );
      if (w <= MOBILE_WIDTH) moveIntoSheet();
      else restoreFromSheet();
    } catch (e) {
      // pass - ignore
    }
  }

  // Run on load
  window.addEventListener("load", () => setTimeout(evaluateWindow, 50));
  // Run on resize/orientation change
  window.addEventListener("resize", () => evaluateWindow());
  window.addEventListener("orientationchange", () =>
    setTimeout(evaluateWindow, 50)
  );
})();
