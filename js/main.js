/**
 * CGViz - main.js - handles:
 * - Main application logic
 * - Canvas draw calls
 * - Algorithm/topic selection & option shuffling
 * - Most of the reactive/dynamic behaviour - some handled by controls.js, export by export-utils.js
 *
 * Known Issues: FIXME:
 * - [ ] Too damn long. But I want to keep it this way for educational purposes, and I think, individual functions provide good logic separation as-is.
 * - [ ] Some code blocks and patterns can be reused. Note that some things are intentionally kept verbose.
 * - [ ] Check TODO:s below.
 */

// Global variables
let algorithmManager;
let uiControls;
let canvas;
let isDragging = false;
let dragStart = null;
let showFPS = false;
let frameRateValue = 0;
let darkMode = false;
let showCanvasText = true; // Toggle to control visibility of informational text drawn on the canvas

// Right-click removal variables
let isRightClick = false;

// Canvas transformation variables for pan/zoom
let canvasTransform = {
  x: 0,
  y: 0,
  scale: 1,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
};

// Hover state variables
let hoverState = {
  hoveredPoint: null,
  hoveredSegment: null,
  hoveredInterval: null,
  hoveredLine: null,
  hoveredRectangle: null,
  tooltipVisible: false,
  tooltipX: 0,
  tooltipY: 0,
  tooltipText: "",
};

/**
 * NOTE: GPT-Generated JSDoc | TODO: Once stable, rewrite properly.
 *
 * Manages selectable algorithm instances and mediates interactions between the UI and
 * the currently selected algorithm implementation.
 *
 * Responsibilities:
 * - Holds a mapping of algorithm name -> algorithm instance.
 * - Tracks the currently selected algorithm by name.
 * - Delegates input operations (points, segments, intervals, lines, rectangles) to the
 *   active algorithm when supported.
 * - Provides step navigation (next/prev) and step log updates for algorithms that
 *   expose step-by-step information either via methods or via a `steps` array.
 * - Updates UI elements (duality toggles/controls/legend, algorithm <select>, stats,
 *   and step log) when the algorithm changes or when clearing/resetting state.
 *
 * Expected algorithm instance shape (optional methods/properties — AlgorithmManager
 * checks for existence, before calling):
 * - addPoint(point) | addVertex(point)
 * - addSegment(segment)
 * - addInterval(interval)
 * - addLine(line)
 * - addRectangle(rectangle)
 * - removePoint(point) | removeVertex(point)
 * - removeSegment(segment)
 * - removeInterval(interval)
 * - removeLine(line)
 * - removeRectangle(rectangle)
 * - clear()
 * - steps: Array<{ description?: string, ... }>
 * - currentStep: number
 * - nextStep(): boolean
 * - prevStep(): boolean
 * - canGoNext(): boolean
 * - canGoPrev(): boolean
 * - getCurrentStep(): any
 * - toggleDuality(): void
 *
 * Notes on UI interactions:
 * - setAlgorithm will show/hide DOM elements with ids:
 *   "duality-toggle-container", "duality-controls", "duality-legend",
 *   "duality-legend-body", "duality-legend-btn", and "algorithm-select".
 * - updateStepLog will populate the element with id "step-log-content" and attempt to
 *   scroll the current step into view.
 * - clear() will also update "stats-container" to show "Steps: 0/0".
 * - setAlgorithm will call window.uiControls.updateInstructions() if that function exists.
 *
 * @class
 */
class AlgorithmManager {
  constructor() {
    this.currentAlgorithm = "segmentIntersection"; // Default algorithm
    this.algorithms = {
      segmentIntersection: new LineSegmentIntersection(),
      rectangleUnion: new RectangleUnionAlgorithm(),
      rectangleIntersection: new RectangleIntersectionAlgorithm(),
      artGallery: new ArtGalleryAlgorithm(),
      grahamScan: new GrahamScanAlgorithm(),
      giftWrap: new GiftWrapAlgorithm(),
      quickHull: new QuickHullAlgorithm(),
      triangulation: new PolygonTriangulation(),
      delaunay: new DelaunayBowyerWatson(),
      voronoi: new VoronoiAlgorithm(),
      fortuneVoronoi: new FortuneVoronoiAlgorithm(),
      duality: new DualityAlgorithm(),
      intervalTree: new IntervalTreeAlgorithm(),
      segmentTree: new SegmentTreeAlgorithm(),
    };
  }

  setAlgorithm(algorithmName) {
    this.currentAlgorithm = algorithmName;

    // Show/hide duality toggle based on algorithm
    const dualityToggleContainer = document.getElementById(
      "duality-toggle-container"
    );
    if (dualityToggleContainer) {
      if (
        this.currentAlgorithm === "voronoi" ||
        this.currentAlgorithm === "delaunay"
      ) {
        dualityToggleContainer.classList.remove("hidden");
      } else {
        dualityToggleContainer.classList.add("hidden");
      }
    }

    // Show/hide duality controls based on algorithm
    const dualityControls = document.getElementById("duality-controls");
    if (this.currentAlgorithm === "duality") {
      dualityControls.style.display = "block";
    } else {
      dualityControls.style.display = "none";
    }

    // Show/hide duality legend based on algorithm
    const dualityLegend = document.getElementById("duality-legend");
    if (dualityLegend) {
      if (this.currentAlgorithm === "duality") {
        dualityLegend.style.display = "block";
        // Ensure the collapsible body is opened so the legend content is visible
        try {
          const body = document.getElementById("duality-legend-body");
          const btn = document.getElementById("duality-legend-btn");
          if (body && body.classList.contains("collapsed")) {
            // toggleCollapsible is defined in index.html; call it to open the panel
            if (typeof toggleCollapsible === "function")
              toggleCollapsible("duality-legend-body", btn);
            else body.classList.remove("collapsed");
          }
        } catch (e) {}
      } else {
        dualityLegend.style.display = "none";
      }
    }

    // Keep any algorithm <select> in sync if present
    const algSelect = document.getElementById("algorithm-select");
    if (algSelect) algSelect.value = this.currentAlgorithm;

    // Notify UI controls (if initialized) so instructions and other UI reflect the change
    if (
      window.uiControls &&
      typeof window.uiControls.updateInstructions === "function"
    ) {
      window.uiControls.updateInstructions();
    }
  }

  getCurrentAlgorithm() {
    return this.algorithms[this.currentAlgorithm];
  }

  addPoint(point) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.addPoint) {
      algorithm.addPoint(point);
    } else if (algorithm.addVertex) {
      algorithm.addVertex(point);
    }
  }

  addSegment(segment) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.addSegment) {
      algorithm.addSegment(segment);
    }
  }

  addInterval(interval) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.addInterval) {
      algorithm.addInterval(interval);
    }
  }

  addLine(line) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.addLine) {
      algorithm.addLine(line);
    }
  }

  addRectangle(rectangle) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.addRectangle) {
      algorithm.addRectangle(rectangle);
    }
  }

  clear() {
    this.getCurrentAlgorithm().clear();

    // Update the stats display
    const statsContainer = document.getElementById("stats-container");
    if (statsContainer) {
      statsContainer.style.display = "block";
      statsContainer.innerHTML = `Steps: 0/0`;
    }

    // Clear the step log
    this.updateStepLog();
  }

  // Clear without touching other UI bits (used by Randomizer to reset only model state)
  softClear() {
    const alg = this.getCurrentAlgorithm();
    if (alg && typeof alg.clear === "function") {
      alg.clear();
    }
  }

  removePoint(point) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.removePoint) {
      algorithm.removePoint(point);
    } else if (algorithm.removeVertex) {
      algorithm.removeVertex(point);
    }
    // Reset algorithm state when removing points
    this.updateStepLog();
  }

  removeSegment(segment) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.removeSegment) {
      algorithm.removeSegment(segment);
    }
    // Reset algorithm state when removing segments
    this.updateStepLog();
  }

  removeInterval(interval) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.removeInterval) {
      algorithm.removeInterval(interval);
    }
    // Reset algorithm state when removing intervals
    this.updateStepLog();
  }

  removeLine(line) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.removeLine) {
      algorithm.removeLine(line);
    }
    // Reset algorithm state when removing lines
    this.updateStepLog();
  }

  removeRectangle(rectangle) {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.removeRectangle) {
      algorithm.removeRectangle(rectangle);
    }
    // Reset algorithm state when removing rectangles
    this.updateStepLog();
  }

  updateStepLog() {
    const logContainer = document.getElementById("step-log-content");
    if (!logContainer) return;

    const algorithm = this.getCurrentAlgorithm();
    if (!algorithm.steps || algorithm.steps.length === 0) {
      logContainer.innerHTML =
        "<p>No steps recorded yet. Run the algorithm to see step-by-step progress.</p>";
      return;
    }

    let logHTML = "";
    for (let i = 0; i < algorithm.steps.length; i++) {
      const step = algorithm.steps[i];
      const isCurrentStep = i === algorithm.currentStep;
      const stepClass = isCurrentStep ? "current-step" : "";

      logHTML += `<div class="step-entry ${stepClass}">
                <strong>Step ${i + 1}:</strong> ${
        step.description || "Processing..."
      }
            </div>`;
    }

    logContainer.innerHTML = logHTML;

    // Auto-scroll the current step entry into view inside the step log
    try {
      const currentEl = logContainer.querySelector(".current-step");
      // Don't auto-scroll on mobile viewports
      const isMobile =
        (window.matchMedia &&
          window.matchMedia("(max-width: 640px)").matches) ||
        window.innerWidth <= 640;
      if (currentEl && !isMobile) {
        currentEl.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }
    } catch (e) {
      // pass
    }
  }

  nextStep() {
    const alg = this.getCurrentAlgorithm();
    let advanced = false;
    if (typeof alg.nextStep === "function") {
      advanced = !!alg.nextStep();
    } else if (Array.isArray(alg.steps)) {
      if (typeof alg.currentStep !== "number") alg.currentStep = 0;
      if (alg.currentStep < alg.steps.length - 1) {
        alg.currentStep++;
        advanced = true;
      }
    }
    this.updateStepLog();
    return advanced;
  }

  prevStep() {
    const alg = this.getCurrentAlgorithm();
    let moved = false;
    if (typeof alg.prevStep === "function") {
      moved = !!alg.prevStep();
    } else if (Array.isArray(alg.steps)) {
      if (typeof alg.currentStep !== "number") alg.currentStep = 0;
      if (alg.currentStep > 0) {
        alg.currentStep--;
        moved = true;
      }
    }
    this.updateStepLog();
    return moved;
  }

  canGoNext() {
    const alg = this.getCurrentAlgorithm();
    if (typeof alg.canGoNext === "function") return !!alg.canGoNext();
    if (Array.isArray(alg.steps)) {
      const idx = typeof alg.currentStep === "number" ? alg.currentStep : 0;
      return idx < alg.steps.length - 1;
    }
    return false;
  }

  canGoPrev() {
    const alg = this.getCurrentAlgorithm();
    if (typeof alg.canGoPrev === "function") return !!alg.canGoPrev();
    if (Array.isArray(alg.steps)) {
      const idx = typeof alg.currentStep === "number" ? alg.currentStep : 0;
      return idx > 0;
    }
    return false;
  }

  getCurrentStep() {
    return this.getCurrentAlgorithm().getCurrentStep();
  }

  toggleDuality() {
    const algorithm = this.getCurrentAlgorithm();
    if (algorithm.toggleDuality) {
      algorithm.toggleDuality();
    }
  }
}

function setup() {
  // Canvas
  const container = document.getElementById("canvas-container");
  // Ensure canvas fills the container completely.
  const rect = container.getBoundingClientRect();
  const canvasWidth = Math.round(window.innerWidth - rect.left);
  const canvasHeight = Math.round(container.clientHeight);

  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-container");
  try {
    if (canvas && canvas.canvas) {
      canvas.canvas.style.display = "block";
      canvas.canvas.style.boxSizing = "border-box";
      canvas.canvas.style.width = canvasWidth + "px";
      canvas.canvas.style.height = canvasHeight + "px";
    }
  } catch (e) {}

  // FPS counter
  const fpsCounter = document.createElement("div");
  fpsCounter.id = "fps-counter";
  fpsCounter.textContent = "FPS: 0";
  container.appendChild(fpsCounter);

  // Algorithm stats container
  const statsContainer = document.createElement("div");
  statsContainer.id = "stats-container";
  statsContainer.className = "stats-container";
  container.appendChild(statsContainer);

  // Current step overlay + playback controls
  const stepInfoContainer = document.createElement("div");
  stepInfoContainer.id = "step-info-container";
  stepInfoContainer.className = "step-info-container";
  stepInfoContainer.innerHTML = `
        <div class="step-info-content">
            <strong>Current Step:</strong>
            <span id="step-info">Ready to start</span>
        </div>
    `;
  const controlOverlay = document.getElementById("control-overlay");
  const playbackControls = document.getElementById("playback-controls");
  if (controlOverlay) {
    controlOverlay.insertBefore(
      stepInfoContainer,
      controlOverlay.firstElementChild
    );
  } else if (playbackControls) {
    playbackControls.style.position =
      playbackControls.style.position || "relative";
    playbackControls.appendChild(stepInfoContainer);
  } else {
    // Fallback: append to canvas container
    container.appendChild(stepInfoContainer);
  }

  // Tooltip container - used to show info on various object drawn on the canvas
  const tooltipContainer = document.createElement("div");
  tooltipContainer.id = "canvas-tooltip";
  tooltipContainer.className = "canvas-tooltip";
  tooltipContainer.style.display = "none";
  container.appendChild(tooltipContainer);

  // Initialize managers AFTER (NOTE) creating the DOM elements
  // + make them globally accessible
  algorithmManager = new AlgorithmManager();
  uiControls = new UIControls();
  window.algorithmManager = algorithmManager;
  window.uiControls = uiControls;

  // Duality viz toggle (Delaunay + Voronoi)
  const dualityToggle = document.getElementById("duality-toggle");
  if (dualityToggle) {
    dualityToggle.addEventListener("change", () => {
      algorithmManager.toggleDuality();
    });
  }

  // Canvas controls
  const canvasControls = document.createElement("div");
  canvasControls.id = "canvas-controls";
  canvasControls.className = "canvas-controls";
  canvasControls.innerHTML = `
    <div class="control-toggle-group">
      <label class="control-toggle" title="Dark Mode">
        <input type="checkbox" id="dark-mode-toggle" />
        <span class="control-icon control-dark">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </span>
      </label>

      <label class="control-toggle" title="Show FPS">
        <input type="checkbox" id="fps-toggle" />
        <span class="control-icon control-fps">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity">
            <path d="M22 12h-4l-3 9-4-18-3 9H2"></path>
          </svg>
        </span>
      </label>

      <label class="control-toggle" title="Show Canvas Text">
        <input type="checkbox" id="canvas-text-toggle" checked />
        <span class="control-icon control-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
        </span>
      </label>

    </div>

    <button id="reset-view-btn" title="Reset View">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-target-icon lucide-target"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    </button>
    <button id="zoom-in-btn" title="Zoom In">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-zoom-in-icon lucide-zoom-in"
        >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
            <line x1="11" x2="11" y1="8" y2="14" />
            <line x1="8" x2="14" y1="11" y2="11" />
        </svg>
    </button>
    <button id="zoom-out-btn" title="Zoom Out">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-zoom-out-icon lucide-zoom-out"
        >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
            <line x1="8" x2="14" y1="11" y2="11" />
        </svg>
    </button>
    <button id="focus-canvas-btn" class="control-toggle" title="Focus Canvas" aria-pressed="false">
        <span class="control-icon control-focus" id="focus-canvas-icon">
          <!-- eye icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <!-- eye-off icon (hidden by default) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off" style="display:none">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.79 21.79 0 0 1 5.06-6.94"></path>
            <path d="M1 1l22 22"></path>
            <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12"></path>
          </svg>
        </span>
    </button>
    `;
  container.appendChild(canvasControls);

  // Duality controls (initially hidden)
  const dualityControls = document.createElement("div");
  dualityControls.id = "duality-controls";
  dualityControls.className = "duality-controls";
  dualityControls.style.display = "none";
  dualityControls.innerHTML = `
        <div class="duality-toggles">
            <label><input type="checkbox" id="show-points" checked> Points</label>
            <label><input type="checkbox" id="show-lines" checked> Lines</label>
            <label><input type="checkbox" id="show-dual-points" checked> Dual Points</label>
            <label><input type="checkbox" id="show-dual-lines" checked> Dual Lines</label>
        </div>
    `;
  container.appendChild(dualityControls);

  // Instructions panel
  // UIControls.updateInstructions() updates span#instructions text per-algorithm.
  const instructionsPanel = document.createElement("div");
  instructionsPanel.id = "instructions-panel";
  instructionsPanel.className = "instructions-panel";
  // (visibility controlled via .open class)
  instructionsPanel.style.display = "block";
  instructionsPanel.innerHTML = `
    <div class="instructions-panel-header">
      <h3 id="algorithm-title">&nbsp;</h3>
      <button id="instructions-close-btn" aria-label="Close instructions">✕</button>
    </div>

    <div class="algorithm-info-full" id="algorithm-info-panel">
      <div id="algorithm-info">&nbsp;</div>
    </div>

    <hr class="instructions-sep" />

    <div class="instructions-panel-body">
      <div class="instructions-list">
        <ul id="instructions-list">
          <li><strong>Left click:</strong> <span class="instr-left" tabindex="-1">&nbsp;</span></li>
          <li><strong>Right click:</strong> <span class="instr-right" tabindex="-1">&nbsp;</span></li>
          <li><strong>Middle click + drag:</strong> <span class="instr-middle" tabindex="-1">&nbsp;</span></li>
          <li><strong>Mouse wheel:</strong> <span class="instr-wheel" tabindex="-1">&nbsp;</span></li>
        </ul>
      </div>
      </div>
    <hr class="instructions-sep" />
    <div class="instructions-panel-body">
        <div class="keyboard-shortcuts">
          <h4>Keyboard shortcuts</h4>
          <ul id="keyboard-shortcuts-list">
            <li><strong>Arrow keys:</strong> Pan canvas view</li>
            <li><strong>f:</strong> Show/hide overlays</li>
            <li><strong>h / l:</strong> Step Prev / Step Next</li>
            <li><strong>j:</strong> Stop / Pause autoplay</li>
            <li><strong>k / Space:</strong> Play / Pause</li>
            <li><strong>c:</strong> Clear current inputs</li>
            <li><strong>v:</strong> Randomize inputs</li>
            <li><strong>s:</strong> Focus algorithm dropdown</li>
            <li><strong>i:</strong> Toggle Instructions / Info panel</li>
            <li><strong>t:</strong> Toggle canvas informational text</li>
            <li><strong>r:</strong> Reset canvas view</li>
            <li><strong>+ / -:</strong> Zoom in / Zoom out</li>
            <li><strong>, / . (or &lt; / &gt;):</strong> Dec / Inc speed</li>
          </ul>
        </div>
      </div>
    </div>
  `;
  container.appendChild(instructionsPanel);

  // Instructions panel: Persistent warning line
  try {
    const warnLine = document.createElement("div");
    warnLine.className = "phone-warning-line";
    warnLine.textContent = "Best viewed in 1920x1080p on Firefox (Desktop)";
    warnLine.style.marginTop = "10px";
    warnLine.style.fontSize = "12px";
    warnLine.style.opacity = "0.9";
    instructionsPanel.appendChild(warnLine);
  } catch (e) {}

  // Phone-only startup warning overlay
  (function phoneStartupWarning() {
    const STORAGE_KEY = "cgviz_hide_phone_warning";
    const isMobile =
      (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) ||
      window.innerWidth <= 640;
    if (!isMobile) return;
    // If user opted out, skip
    try {
      if (
        localStorage &&
        localStorage.getItem &&
        localStorage.getItem(STORAGE_KEY) === "1"
      )
        return;
    } catch (e) {
      // pass - ignore localStorage errors
    }

    // Don't show, when focus-canvas mode is active
    if (
      document.body.classList &&
      document.body.classList.contains("focus-canvas")
    )
      return;

    // Build overlay
    const overlay = document.createElement("div");
    overlay.className = "phone-warning-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="phone-warning-content" role="document">
        <div class="phone-warning-text">
          Optimized for desktop viewing in Firefox at 1920×1080 resolution<br>
          Please refer to <a href="https://github.com/JeS24/CGViz/issues/1" target="_blank" rel="noopener noreferrer">issue #1</a> for mobile responsiveness issues.
        </div>
        <div class="phone-warning-countdown" aria-hidden="true">Closing in <span id="phone-warning-seconds">5</span>s...</div>
        <div class="phone-warning-actions">
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;" for="phone-warning-dontshow">
            <input type="checkbox" id="phone-warning-dontshow" /> Don't show again
          </label>
          <button id="phone-warning-close" aria-label="Close" class="phone-warning-close">Close</button>
        </div>
      </div>
    `;

    // Insert into DOM
    try {
      document.body.appendChild(overlay);
    } catch (e) {
      return;
    }

    // Prevent background from being interacted with, while overlay is present
    document.body.style.touchAction = "none";
    overlay.focus && overlay.focus();

    let countdownTimer = null;
    let secondsLeft = 5;

    const updateCountdownUI = () => {
      try {
        const el = overlay.querySelector("#phone-warning-seconds");
        if (el) el.textContent = String(secondsLeft);
      } catch (e) {}
    };

    const removeOverlay = (persistDontShow) => {
      try {
        if (persistDontShow) {
          try {
            localStorage.setItem(STORAGE_KEY, "1");
          } catch (e) {
            // pass - ignore
          }
        }
      } catch (e) {}
      if (overlay && overlay.parentNode)
        overlay.parentNode.removeChild(overlay);
      // Restore touch behavior
      document.body.style.touchAction = "";
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    };

    // Close button (manual dismiss)
    const closeBtn = overlay.querySelector("#phone-warning-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cb = overlay.querySelector("#phone-warning-dontshow");
        const persist = !!(cb && cb.checked);
        removeOverlay(persist);
      });
    }

    // Start a visible countdown and remove overlay at 0
    updateCountdownUI();
    countdownTimer = setInterval(() => {
      secondsLeft -= 1;
      updateCountdownUI();
      if (secondsLeft <= 0) {
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        const cb = overlay.querySelector("#phone-warning-dontshow");
        const persist = !!(cb && cb.checked);
        removeOverlay(persist);
      }
    }, 1000);

    // Dismiss on Escape
    const escHandler = (ev) => {
      if (ev.key === "Escape") {
        const cb = overlay.querySelector("#phone-warning-dontshow");
        const persist = !!(cb && cb.checked);
        removeOverlay(persist);
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    // Ensure overlay doesn't let clicks fall through to the canvas,
    // but allow interactive controls (inputs/buttons/labels) inside
    // the `.phone-warning-content` to receive their default actions.
    const stopHandler = (e) => {
      try {
        const content = overlay.querySelector(".phone-warning-content");
        if (content && e.target && content.contains(e.target)) {
          // NOTE: Do not call preventDefault so inputs (checkboxes) work.
          e.stopPropagation();
          return;
        }
      } catch (err) {
        // pass
      }

      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
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
      overlay.addEventListener(evt, stopHandler, { passive: false })
    );
  })();

  // Setters for UIControls to update main.js globals
  window.setDarkMode = (val) => {
    darkMode = !!val;
    document.body.classList.toggle("dark-mode", darkMode);
    // Keep the checkbox and aria state in sync
    try {
      const chk = document.getElementById("dark-mode-toggle");
      if (chk) {
        chk.checked = darkMode;
        const lbl = chk.closest && chk.closest(".control-toggle");
        if (lbl && lbl.setAttribute)
          lbl.setAttribute("aria-checked", darkMode ? "true" : "false");
      }
    } catch (e) {}
  };

  window.setShowFPS = (val) => {
    showFPS = !!val;
    const fpsCounter = document.getElementById("fps-counter");
    if (fpsCounter) fpsCounter.style.display = showFPS ? "block" : "none";
    // Sync checkbox and aria state
    try {
      const chk = document.getElementById("fps-toggle");
      if (chk) {
        chk.checked = showFPS;
        const lbl = chk.closest && chk.closest(".control-toggle");
        if (lbl && lbl.setAttribute)
          lbl.setAttribute("aria-checked", showFPS ? "true" : "false");
      }
    } catch (e) {}
  };

  // Toggle showing/hiding canvas text (usually, should have: step descriptions, duality labels, etc.)
  window.setShowCanvasText = (val) => {
    showCanvasText = !!val;
    // Sync checkbox state if present
    try {
      const chk = document.getElementById("canvas-text-toggle");
      if (chk) {
        chk.checked = showCanvasText;
        const lbl = chk.closest && chk.closest(".control-toggle");
        if (lbl && lbl.setAttribute)
          lbl.setAttribute("aria-checked", showCanvasText ? "true" : "false");
      }
    } catch (e) {}
  };

  // Toggle to focus canvas: hide overlays and keep only canvas + canvas-controls visible
  window.setFocusCanvas = (val) => {
    const active = !!val;
    // Preserve current canvas transform so toggling UI classes doesn't inadvertently reset view.
    let savedTransform = null;
    try {
      savedTransform = {
        x: canvasTransform.x,
        y: canvasTransform.y,
        scale: canvasTransform.scale,
      };
    } catch (e) {
      savedTransform = null;
    }

    try {
      document.body.classList.toggle("focus-canvas", active);
    } catch (e) {}

    // Restore saved transform to ensure no reset occurs
    try {
      if (savedTransform) {
        canvasTransform.x = savedTransform.x;
        canvasTransform.y = savedTransform.y;
        canvasTransform.scale = savedTransform.scale;
      }
    } catch (e) {}

    // Sync focus button aria state and icon visibility
    try {
      const btn = document.getElementById("focus-canvas-btn");
      if (btn) {
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        const eye = btn.querySelector(".lucide-eye");
        const eyeOff = btn.querySelector(".lucide-eye-off");
        if (eye) eye.style.display = active ? "none" : "";
        if (eyeOff) eyeOff.style.display = active ? "" : "none";
      }
    } catch (e) {}

    // DEBUG: Log
    try {
      console.log(
        "[main] setFocusCanvas: active=",
        active,
        "isPlaying=",
        window.uiControls && window.uiControls.isPlaying
      );
    } catch (e) {}
  };

  // UIControls: bind canvas toggles
  if (
    window.uiControls &&
    typeof window.uiControls.setupCanvasToggles === "function"
  ) {
    window.uiControls.setupCanvasToggles();
  }

  // Fallback: listen for change events on the canvas controls
  // and call the main setters so the globals are always updated.
  canvasControls.addEventListener("change", (e) => {
    const t = e.target;
    if (!t) return;
    if (t.id === "dark-mode-toggle") {
      try {
        if (typeof window.setDarkMode === "function")
          window.setDarkMode(t.checked);
        else darkMode = !!t.checked;
      } catch (err) {}
      e.stopPropagation();
    }
    if (t.id === "fps-toggle") {
      try {
        if (typeof window.setShowFPS === "function")
          window.setShowFPS(t.checked);
        else showFPS = !!t.checked;
      } catch (err) {}
      e.stopPropagation();
    }
    if (t.id === "canvas-text-toggle") {
      try {
        if (typeof window.setShowCanvasText === "function")
          window.setShowCanvasText(t.checked);
        else showCanvasText = !!t.checked;
      } catch (err) {}
      e.stopPropagation();
    }
    if (t.id === "focus-canvas-toggle") {
      try {
        if (typeof window.setFocusCanvas === "function")
          window.setFocusCanvas(t.checked);
        else document.body.classList.toggle("focus-canvas", !!t.checked);
      } catch (err) {}
      e.stopPropagation();
    }
  });

  // Toggle logic for info button and outside click/escape behavior
  const infoBtn = document.getElementById("info-btn");
  const panel = document.getElementById("instructions-panel");

  const openPanel = () => {
    panel.classList.add("open");
    infoBtn.setAttribute("aria-expanded", "true");
  };

  const closePanel = () => {
    panel.classList.remove("open");
    infoBtn.setAttribute("aria-expanded", "false");
  };

  // Clicking outside should close the panel
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !infoBtn.contains(e.target)) {
      if (panel.classList.contains("open")) closePanel();
    }
  });

  // Escape key closes the panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (panel.classList.contains("open")) closePanel();
    }
  });

  // Top-right overlays container (controls + Duality legend )
  // NOTE: generally captures pointer events so interactions don't fall through to the canvas
  const topLeft = document.getElementById("top-left-overlays") || container;
  const legendPanel = document.createElement("div");
  legendPanel.id = "duality-legend";
  legendPanel.className = "panel-overlay";

  legendPanel.innerHTML = `
    <div class="collapsible-header panel-header">
      <button class="panel-toggle" aria-expanded="false" aria-controls="duality-legend-body" id="duality-legend-btn" onclick="toggleCollapsible('duality-legend-body', this)">
        <span class="panel-title">Duality Legend</span>
        <span class="panel-icon" id="duality-legend-body-toggle"><i data-lucide="chevron-down"></i></span>
      </button>
    </div>
    <div id="duality-legend-body" class="collapsible-content collapsed">
      <div class="legend-body">
        <div class="legend-header-text">
          Point (a, b) <i data-lucide="repeat" class="legend-icon"></i> Line y = a x - b
          <br/>Line y = m x + c <i data-lucide="repeat" class="legend-icon"></i> Point (m, -c)
        </div>

        <div class="legend-row">
          <div class="legend-marker"><span class="marker-dot" style="background:rgb(0,100,255); border:1px solid rgb(0,50,200);"></span></div>
          <div class="legend-label">Original Points</div>
        </div>

        <div class="legend-row">
          <div class="legend-marker"><span class="marker-line" style="border-top-color:rgb(255,100,0);"></span></div>
          <div class="legend-label">Original Lines</div>
        </div>

        <div class="legend-row">
          <div class="legend-marker"><span class="marker-line dashed" style="border-top-color:rgb(100,255,100);"></span></div>
          <div class="legend-label">Dual Lines</div>
        </div>

        <div class="legend-row">
          <div class="legend-marker"><span class="marker-dot" style="background:rgb(255,100,255); border:1px solid rgb(200,50,200);"></span></div>
          <div class="legend-label">Dual Points</div>
        </div>
      </div>
    </div>
  `;

  legendPanel.style.display = "none";
  topLeft.appendChild(legendPanel);

  // Ensure icons render
  // (NOTE: Source of many visual bugs initially - check if some regression occurs)
  try {
    lucide && lucide.createIcons && lucide.createIcons();
  } catch (e) {}

  // NOTE: Bubble-phase handlers to stop events from reaching the canvas
  // We don't want any canvas interactivity, even hover, through these elements.
  (function attachPanelBlocking(panel) {
    if (!panel) return;
    let touchStartY = 0;
    const forwardWheelToContent = (content, deltaY) => {
      content.scrollTop += deltaY;
    };

    const handler = (e) => {
      const target = e.target;
      const content =
        target.closest(".collapsible-content") ||
        panel.querySelector(".collapsible-content");

      if (e.type === "wheel") {
        if (content) {
          if (e.cancelable) e.preventDefault();
          forwardWheelToContent(content, e.deltaY);
          e.stopPropagation();
          return;
        } else {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (e.type === "touchstart") {
        const t = e.touches && e.touches[0];
        if (t) touchStartY = t.clientY;
        return;
      }

      if (e.type === "touchmove") {
        const t = e.touches && e.touches[0];
        if (!t) return;
        const delta = touchStartY - t.clientY;
        if (content) {
          if (e.cancelable) e.preventDefault();
          forwardWheelToContent(content, delta);
          touchStartY = t.clientY;
          e.stopPropagation();
          return;
        } else {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // For pointer/mouse/click/dblclick/etc. stop propagation so canvas handlers don't run
      e.stopPropagation();
    };

    [
      "pointerdown",
      "pointerup",
      "pointermove",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
      "touchstart",
      "touchmove",
      "touchend",
      "wheel",
    ].forEach((evt) =>
      panel.addEventListener(evt, handler, { passive: false })
    );
  })(legendPanel);

  // Setup canvas control buttons with event prevention
  const setupControlButton = (id, handler) => {
    const btn = document.getElementById(id);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      handler();
    });
    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    btn.addEventListener("mouseup", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    // Prevent pointer events from passing through (for touch/pen)
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  };

  setupControlButton("reset-view-btn", resetCanvasView);
  setupControlButton("zoom-in-btn", () => zoomCanvas(1.2));
  setupControlButton("zoom-out-btn", () => zoomCanvas(0.8));
  setupControlButton("focus-canvas-btn", () => {
    try {
      const btn = document.getElementById("focus-canvas-btn");
      const isPressed =
        btn && btn.getAttribute && btn.getAttribute("aria-pressed") === "true";
      const next = !isPressed;
      window.setFocusCanvas && window.setFocusCanvas(next);
    } catch (e) {}
  });

  // Initialize focus button UI to match existing class (in case page restored state)
  try {
    const btn = document.getElementById("focus-canvas-btn");
    const active =
      document.body.classList &&
      document.body.classList.contains("focus-canvas");
    if (btn) {
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      const eye = btn.querySelector(".lucide-eye");
      const eyeOff = btn.querySelector(".lucide-eye-off");
      if (eye) eye.style.display = active ? "none" : "";
      if (eyeOff) eyeOff.style.display = active ? "" : "none";
    }
  } catch (e) {}

  // Wire info button, so that, it toggles the instructions panel and also prevents click-through
  setupControlButton("info-btn", () => {
    if (!panel.classList.contains("open")) {
      openPanel();
      // Ensure instructions and algorithm info are refreshed when opening
      if (
        window.uiControls &&
        typeof window.uiControls.updateInstructions === "function"
      ) {
        window.uiControls.updateInstructions();
      }
      // Move focus into panel for accessibility
      const firstSpan = panel.querySelector(".instr-left");
      if (firstSpan) firstSpan.focus && firstSpan.focus();
    } else closePanel();
  });

  // Ensure panel itself doesn't let clicks fall through to the canvas
  const panelEl = document.getElementById("instructions-panel");
  panelEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  panelEl.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });
  panelEl.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  // Setup duality toggle handlers
  document.getElementById("show-points").addEventListener("change", (e) => {
    if (algorithmManager.algorithms.duality) {
      algorithmManager.algorithms.duality.showPoints = e.target.checked;
    }
  });
  document.getElementById("show-lines").addEventListener("change", (e) => {
    if (algorithmManager.algorithms.duality) {
      algorithmManager.algorithms.duality.showLines = e.target.checked;
    }
  });
  document
    .getElementById("show-dual-points")
    .addEventListener("change", (e) => {
      if (algorithmManager.algorithms.duality) {
        algorithmManager.algorithms.duality.showDualPoints = e.target.checked;
      }
    });
  document.getElementById("show-dual-lines").addEventListener("change", (e) => {
    if (algorithmManager.algorithms.duality) {
      algorithmManager.algorithms.duality.showDualLines = e.target.checked;
    }
  });

  // Setup export button
  const exportBtn = document.getElementById("export-btn");
  exportBtn.addEventListener("click", window.exportCanvas);

  // Close button inside instructions panel
  const instrClose = document.getElementById("instructions-close-btn");
  if (instrClose) {
    instrClose.addEventListener("click", (e) => {
      e.stopPropagation();
      closePanel();
    });
  }

  // Disable right-click context menu on canvas
  canvas.canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });

  // Keyboard shortcuts (so far)
  // h = prev, l = next, j = play/pause, k = stop; c = clear; r = reset view
  // f = toggle overlays; i = toggle instructions; t = toggle canvas text
  // s = focus algorithm dropdown; v = randomize inputs; Arrow keys = pan canvas
  // + or = = zoom in; - = zoom out; Arrow keys = pan canvas
  window.addEventListener("keydown", (ev) => {
    const e = ev || window.event;
    // Ignore, if focus is on an editable element
    const active = document.activeElement && document.activeElement.tagName;
    if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active)) return;

    // If Ctrl/Alt/Meta are held, don't intercept the key - allow browser/OS shortcuts.
    // We intentionally still handle Shift (e.g. Shift+Tab for focus management) to
    // keep accessibility behaviour intact.
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

    const key = e.key;
    const code = e.code;
    const ctrl = e.ctrlKey;
    const alt = e.altKey;
    const meta = e.metaKey;
    console.log("[kbd] keydown", { key, code, ctrl, alt, meta });

    // Prev (h)
    if (key === "h" || key === "H") {
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.onPrevStep === "function"
      ) {
        window.uiControls.onPrevStep();
      } else if (
        window.algorithmManager &&
        typeof window.algorithmManager.prevStep === "function"
      ) {
        window.algorithmManager.prevStep();
      }
      return;
    }

    // Next (l)
    if (key === "l" || key === "L") {
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.onNextStep === "function"
      ) {
        window.uiControls.onNextStep();
      } else if (
        window.algorithmManager &&
        typeof window.algorithmManager.nextStep === "function"
      ) {
        window.algorithmManager.nextStep();
      }
      return;
    }

    // Play/Pause (j or Space)
    if (key === "k" || key === "K" || key === " ") {
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.onPlayToggle === "function"
      ) {
        window.uiControls.onPlayToggle();
      }
      return;
    }

    // Stop (k) - stop autoplay, if available
    if (key === "j" || key === "J") {
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.stopAutoPlay === "function"
      ) {
        window.uiControls.stopAutoPlay();
      }
      return;
    }

    // Clear (c)
    if (key === "c" || key === "C") {
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.onClear === "function"
      ) {
        window.uiControls.onClear();
      } else if (
        window.algorithmManager &&
        typeof window.algorithmManager.clear === "function"
      ) {
        window.algorithmManager.clear();
      }
      return;
    }

    // Reset view (r)
    if (key === "r" || key === "R") {
      e.preventDefault();
      if (typeof resetCanvasView === "function") resetCanvasView();
      return;
    }

    // Zoom in/out (+/= and -)
    if (key === "+" || key === "=") {
      e.preventDefault();
      if (typeof zoomCanvas === "function") zoomCanvas(1.2);
      return;
    }
    if (key === "-") {
      e.preventDefault();
      if (typeof zoomCanvas === "function") zoomCanvas(1 / 1.2);
      return;
    }

    // Pan with arrow keys
    const panStep = 20;
    if (
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight"
    ) {
      e.preventDefault();
      switch (key) {
        case "ArrowUp":
          canvasTransform.y += panStep;
          break;
        case "ArrowDown":
          canvasTransform.y -= panStep;
          break;
        case "ArrowLeft":
          canvasTransform.x += panStep;
          break;
        case "ArrowRight":
          canvasTransform.x -= panStep;
          break;
      }
      return;
    }

    // Speed control: comma / period (and shifted < and >)
    if (key === "," || key === "<") {
      console.log("[kbd] speed down detected", { key, code });
      e.preventDefault();
      try {
        if (window.uiControls && window.uiControls.speedSlider) {
          const s = window.uiControls.speedSlider;
          const step = Number(s.step) || 1;
          s.value = Math.max(Number(s.min || 0), Number(s.value) - step);
          if (typeof window.uiControls.updatePlaySpeed === "function")
            window.uiControls.updatePlaySpeed();
        }
      } catch (err) {}
      return;
    }
    if (key === "." || key === ">") {
      console.log("[kbd] speed up detected", { key, code });
      e.preventDefault();
      try {
        if (window.uiControls && window.uiControls.speedSlider) {
          const s = window.uiControls.speedSlider;
          const step = Number(s.step) || 1;
          s.value = Math.min(Number(s.max || s.value), Number(s.value) + step);
          if (typeof window.uiControls.updatePlaySpeed === "function")
            window.uiControls.updatePlaySpeed();
        }
      } catch (err) {}
      return;
    }

    // Randomize (v)
    if (key === "v" || key === "V") {
      console.log("[kbd] randomize detected", { key, code });
      e.preventDefault();
      if (
        window.uiControls &&
        typeof window.uiControls.applyRandomize === "function"
      ) {
        window.uiControls.applyRandomize();
      }
      return;
    }

    // Focus algorithm select (s)
    if (key === "s" || key === "S") {
      console.log("[kbd] focusing algorithm select", { key, code });
      e.preventDefault();
      try {
        const sel = document.getElementById("algorithm-select");
        if (sel) sel.focus && sel.focus();
      } catch (err) {}
      return;
    }

    // Toggle info panel (i)
    if (key === "i" || key === "I") {
      console.log("[kbd] info toggle detected", { key, code });
      e.preventDefault();
      try {
        const infoBtn = document.getElementById("info-btn");
        const panel = document.getElementById("instructions-panel");
        if (panel && infoBtn) {
          if (panel.classList.contains("open")) {
            panel.classList.remove("open");
            infoBtn.setAttribute("aria-expanded", "false");
          } else {
            panel.classList.add("open");
            infoBtn.setAttribute("aria-expanded", "true");
            // refresh contents when opening
            if (
              window.uiControls &&
              typeof window.uiControls.updateInstructions === "function"
            )
              window.uiControls.updateInstructions();
          }
        }
      } catch (err) {}
      return;
    }

    // Toggle canvas text (t)
    if (key === "t" || key === "T") {
      e.preventDefault();
      try {
        const chk = document.getElementById("canvas-text-toggle");
        const next = !(chk ? chk.checked : showCanvasText);
        if (typeof window.setShowCanvasText === "function") {
          window.setShowCanvasText(next);
        } else {
          showCanvasText = next;
          try {
            if (chk) chk.checked = next;
          } catch (err) {}
        }
      } catch (err) {}
      return;
    }

    // Toggle focus canvas (f)
    if (key === "f" || key === "F") {
      e.preventDefault();
      try {
        // Prefer the exposed setter, if available
        const currentActive = document.body.classList
          ? document.body.classList.contains("focus-canvas")
          : false;
        const next = !currentActive;
        if (typeof window.setFocusCanvas === "function") {
          window.setFocusCanvas(next);
        } else {
          // Fallback: toggle class and sync button state
          document.body.classList.toggle("focus-canvas", next);
          try {
            const btn = document.getElementById("focus-canvas-btn");
            if (btn) btn.setAttribute("aria-pressed", next ? "true" : "false");
            const eye =
              btn && btn.querySelector && btn.querySelector(".lucide-eye");
            const eyeOff =
              btn && btn.querySelector && btn.querySelector(".lucide-eye-off");
            if (eye) eye.style.display = next ? "none" : "";
            if (eyeOff) eyeOff.style.display = next ? "" : "none";
          } catch (err) {}
        }
      } catch (err) {}
      return;
    }
  });
  // Set framerate
  frameRate(60);
}

/**
 * Main p5 draw call
 **/
function draw() {
  background(darkMode ? 30 : 255);

  // Apply canvas transformations
  push();
  translate(canvasTransform.x, canvasTransform.y);
  scale(canvasTransform.scale);

  const algorithm = algorithmManager.getCurrentAlgorithm();
  const step = algorithm.getCurrentStep();
  const pointSize = uiControls.getPointSize();

  if (!step && algorithmManager.currentAlgorithm !== "artGallery") {
    // If no step is available, just show an empty canvas (except artGallery, which can draw live state)
    // TODO: Handle artGallery properly. Too many special cases.
    pop();
    return;
  }

  // Draw based on current algorithm
  switch (algorithmManager.currentAlgorithm) {
    case "grahamScan":
      drawGrahamScan(step, pointSize);
      break;
    case "giftWrap":
      drawGiftWrap(step, pointSize);
      break;
    case "quickHull":
      drawQuickHull(step, pointSize);
      break;
    case "segmentIntersection":
      drawSegmentIntersection(step, pointSize);
      break;
    case "triangulation":
      drawTriangulation(step, pointSize);
      break;
    case "delaunay":
      drawDelaunay(step, pointSize);
      break;
    case "voronoi":
      drawVoronoi(step, pointSize);
      break;
    case "fortuneVoronoi":
      drawFortuneVoronoi(step, pointSize);
      break;
    case "intervalTree":
      drawIntervalTree(step, pointSize);
      break;
    case "segmentTree":
      drawSegmentTree(step, pointSize);
      break;
    case "duality":
      // Draw duality within the same transformed canvas, so that pan/zoom works
      drawDuality(step, pointSize);
      break;
    case "rectangleUnion":
      drawRectangleUnion(step, pointSize);
      break;
    case "rectangleIntersection":
      drawRectangleIntersection(step, pointSize);
      break;
    case "artGallery":
      drawArtGallery(step, pointSize);
      break;
  }

  pop();

  // Update FPS counter (outside transformation)
  if (showFPS) {
    frameRateValue = frameRate();
    const fpsCounter = document.getElementById("fps-counter");
    if (fpsCounter) {
      fpsCounter.textContent = `FPS: ${frameRateValue.toFixed(1)}`;
    }
  }

  // Update algorithm stats (outside transformation)
  const statsContainer = document.getElementById("stats-container");
  if (statsContainer && step) {
    const currentStepNumber =
      algorithm.currentStep !== undefined ? algorithm.currentStep + 1 : 0;
    const totalSteps = algorithm.steps ? algorithm.steps.length : 0;

    statsContainer.style.display = "block";
    statsContainer.innerHTML = `Steps: ${currentStepNumber}/${totalSteps}`;
  }
}

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  // Check if it's a right click
  isRightClick = mouseButton === RIGHT;

  // Handle middle mouse button for panning
  if (mouseButton === CENTER) {
    canvasTransform.isDragging = true;
    canvasTransform.lastMouseX = mouseX;
    canvasTransform.lastMouseY = mouseY;
    return;
  }

  // Transform mouse coordinates to canvas space
  const canvasX = (mouseX - canvasTransform.x) / canvasTransform.scale;
  const canvasY = (mouseY - canvasTransform.y) / canvasTransform.scale;

  if (isRightClick) {
    // Right click - remove point/segment
    handleRightClick(canvasX, canvasY);
  } else {
    // Left click - add point/segment/interval
    if (algorithmManager.currentAlgorithm === "segmentIntersection") {
      isDragging = true;
      dragStart = new Point(canvasX, canvasY);
    } else if (algorithmManager.currentAlgorithm === "intervalTree") {
      isDragging = true;
      dragStart = { x: canvasX, y: canvasY };
    } else if (algorithmManager.currentAlgorithm === "segmentTree") {
      isDragging = true;
      dragStart = { x: canvasX, y: canvasY };
    } else if (algorithmManager.currentAlgorithm === "duality") {
      // Use canvas-space coordinates for duality, so that, pan/zoom works
      isDragging = true;
      dragStart = new Point(canvasX, canvasY);
    } else if (
      algorithmManager.currentAlgorithm === "rectangleUnion" ||
      algorithmManager.currentAlgorithm === "rectangleIntersection"
    ) {
      isDragging = true;
      dragStart = new Point(canvasX, canvasY);
    } else if (algorithmManager.currentAlgorithm === "artGallery") {
      // Add vertex to polygon
      const algorithm = algorithmManager.getCurrentAlgorithm();
      if (!algorithm.polygon.isComplete) {
        algorithm.addVertex(canvasX, canvasY);
        uiControls.updateButtons();
        uiControls.updateStepInfo();
      }
    } else {
      // Add point for other algorithms
      const point = new Point(canvasX, canvasY);
      algorithmManager.addPoint(point);
      uiControls.updateButtons();
      uiControls.updateStepInfo();
    }
  }
}

function mouseReleased() {
  if (canvasTransform.isDragging) {
    canvasTransform.isDragging = false;
    return;
  }

  if (isDragging && dragStart && !isRightClick) {
    const canvasX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const canvasY = (mouseY - canvasTransform.y) / canvasTransform.scale;

    if (algorithmManager.currentAlgorithm === "segmentIntersection") {
      const dragEnd = new Point(canvasX, canvasY);
      const segment = new LineSegment(dragStart, dragEnd);
      algorithmManager.addSegment(segment);
    } else if (
      algorithmManager.currentAlgorithm === "intervalTree" ||
      algorithmManager.currentAlgorithm === "segmentTree"
    ) {
      // Convert canvas coordinates to number line values
      const numberLineY = height / 2;
      const numberLineStart = 50;
      const numberLineEnd = width - 50;
      const numberLineRange = 100; // 0 to 100

      const startValue =
        ((dragStart.x - numberLineStart) / (numberLineEnd - numberLineStart)) *
        numberLineRange;
      const endValue =
        ((canvasX - numberLineStart) / (numberLineEnd - numberLineStart)) *
        numberLineRange;

      if (
        startValue >= 0 &&
        startValue <= numberLineRange &&
        endValue >= 0 &&
        endValue <= numberLineRange
      ) {
        const interval = new Interval(startValue, endValue);
        algorithmManager.addInterval(interval);
      }
    } else if (algorithmManager.currentAlgorithm === "duality") {
      const dragEnd = new Point(canvasX, canvasY);
      // Check if we're creating a point or a line based on drag distance (canvas-space)
      const dragDistance = dist(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y);
      if (dragDistance < 10) {
        // Short drag or click - create a point at dragStart
        algorithmManager.addPoint(new Point(dragStart.x, dragStart.y));
      } else {
        // Long drag - create a line from dragStart to dragEnd
        const line = DualLine.fromPoints(dragStart, dragEnd);
        algorithmManager.addLine(line);
      }
    } else if (
      algorithmManager.currentAlgorithm === "rectangleUnion" ||
      algorithmManager.currentAlgorithm === "rectangleIntersection"
    ) {
      const dragEnd = new Point(canvasX, canvasY);
      const rectangle = Rectangle.fromPoints(dragStart, dragEnd);
      algorithmManager.addRectangle(rectangle);
    }

    uiControls.updateButtons();
    uiControls.updateStepInfo();
  }

  isDragging = false;
  dragStart = null;
  isRightClick = false;
}

function mouseDragged() {
  // Handle canvas panning
  if (canvasTransform.isDragging) {
    const deltaX = mouseX - canvasTransform.lastMouseX;
    const deltaY = mouseY - canvasTransform.lastMouseY;
    canvasTransform.x += deltaX;
    canvasTransform.y += deltaY;
    canvasTransform.lastMouseX = mouseX;
    canvasTransform.lastMouseY = mouseY;
    return;
  }

  // Visual feedback for line sweep and interval tree
  if (
    isDragging &&
    dragStart &&
    (algorithmManager.currentAlgorithm === "segmentIntersection" ||
      algorithmManager.currentAlgorithm === "intervalTree")
  ) {
    // pass - this will be drawn in the next frame
  }
}

function mouseMoved() {
  // Don't show hover effects while dragging
  if (isDragging || canvasTransform.isDragging) {
    hideTooltip();
    return;
  }

  // Only check hover if mouse is over canvas
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    hideTooltip();
    return;
  }

  // Transform mouse coordinates to canvas space
  const canvasX = (mouseX - canvasTransform.x) / canvasTransform.scale;
  const canvasY = (mouseY - canvasTransform.y) / canvasTransform.scale;

  checkHover(canvasX, canvasY);
}

function windowResized() {
  const container = document.getElementById("canvas-container");
  const rect = container.getBoundingClientRect();
  const canvasWidth = Math.round(window.innerWidth - rect.left);
  const canvasHeight = Math.round(container.clientHeight);
  resizeCanvas(canvasWidth, canvasHeight);
  // Keep the DOM <canvas> CSS size in sync with the new drawing buffer size.
  try {
    if (canvas && canvas.canvas) {
      canvas.canvas.style.width = canvasWidth + "px";
      canvas.canvas.style.height = canvasHeight + "px";
    }
  } catch (e) {}
}

function mouseWheel(event) {
  // Only zoom if mouse is over the canvas
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    return true; // Allow normal scrolling outside canvas
  }

  // Zoom with mouse wheel
  const zoomFactor = event.delta > 0 ? 0.9 : 1.1;
  const mouseXCanvas = mouseX;
  const mouseYCanvas = mouseY;

  // Zoom towards mouse position
  canvasTransform.x =
    mouseXCanvas - (mouseXCanvas - canvasTransform.x) * zoomFactor;
  canvasTransform.y =
    mouseYCanvas - (mouseYCanvas - canvasTransform.y) * zoomFactor;
  canvasTransform.scale *= zoomFactor;

  // Prevent default scrolling, only when over canvas
  return false;
}

function resetCanvasView() {
  // Always allow resetting the canvas view, i.e, Reset View button should work even in focus mode
  canvasTransform.x = 0;
  canvasTransform.y = 0;
  canvasTransform.scale = 1;
}

function zoomCanvas(factor) {
  const centerX = width / 2;
  const centerY = height / 2;

  canvasTransform.x = centerX - (centerX - canvasTransform.x) * factor;
  canvasTransform.y = centerY - (centerY - canvasTransform.y) * factor;
  canvasTransform.scale *= factor;
}

function handleRightClick(canvasX, canvasY) {
  const algorithm = algorithmManager.getCurrentAlgorithm();
  const clickRadius = 15 / canvasTransform.scale; // Adjust for zoom level

  if (algorithmManager.currentAlgorithm === "segmentIntersection") {
    // Remove segment
    if (algorithm.segments) {
      for (let i = algorithm.segments.length - 1; i >= 0; i--) {
        const segment = algorithm.segments[i];
        if (distanceToLineSegment(canvasX, canvasY, segment) < clickRadius) {
          algorithmManager.removeSegment(segment);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          break;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "intervalTree") {
    // Remove interval (now stacked vertically)
    if (algorithm.intervals) {
      const numberLineY = height * 0.8;
      const numberLineStart = 50;
      const numberLineEnd = width - 50;
      const numberLineRange = 100;
      const intervalSpacing = 14;
      const intervalYOffset = 24;

      for (let i = algorithm.intervals.length - 1; i >= 0; i--) {
        const interval = algorithm.intervals[i];
        const startX =
          numberLineStart +
          (interval.start / numberLineRange) *
            (numberLineEnd - numberLineStart);
        const endX =
          numberLineStart +
          (interval.end / numberLineRange) * (numberLineEnd - numberLineStart);
        const intervalY = numberLineY - intervalYOffset - i * intervalSpacing;

        // Check if click is within the stacked interval
        if (
          canvasX >= startX - clickRadius &&
          canvasX <= endX + clickRadius &&
          Math.abs(canvasY - intervalY) < clickRadius
        ) {
          algorithmManager.removeInterval(interval);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          break;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "segmentTree") {
    // Remove interval for segment tree (stacked similarly for simplicity)
    if (algorithm.intervals) {
      const numberLineY = height * 0.8;
      const numberLineStart = 50;
      const numberLineEnd = width - 50;
      const numberLineRange = 100;
      const intervalSpacing = 14;
      const intervalYOffset = 24;
      for (let i = algorithm.intervals.length - 1; i >= 0; i--) {
        const interval = algorithm.intervals[i];
        const startX =
          numberLineStart +
          (interval.start / numberLineRange) *
            (numberLineEnd - numberLineStart);
        const endX =
          numberLineStart +
          (interval.end / numberLineRange) * (numberLineEnd - numberLineStart);
        const intervalY = numberLineY - intervalYOffset - i * intervalSpacing;
        if (
          canvasX >= startX - clickRadius &&
          canvasX <= endX + clickRadius &&
          Math.abs(canvasY - intervalY) < clickRadius
        ) {
          algorithmManager.removeInterval(interval);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          break;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "duality") {
    // Remove point or line in canvas-space
    const rawClickRadius = 15 / canvasTransform.scale; // scale-aware

    // First, try to remove a point
    if (algorithm.points) {
      for (let i = algorithm.points.length - 1; i >= 0; i--) {
        const point = algorithm.points[i];
        const distance = dist(canvasX, canvasY, point.x, point.y);
        if (distance < rawClickRadius) {
          algorithmManager.removePoint(point);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          return;
        }
      }
    }

    // Then, try to remove a line
    if (algorithm.lines) {
      for (let i = algorithm.lines.length - 1; i >= 0; i--) {
        const lineObj = algorithm.lines[i];
        if (distanceToLine(canvasX, canvasY, lineObj) < rawClickRadius) {
          algorithmManager.removeLine(lineObj);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          return;
        }
      }
    }
  } else if (
    algorithmManager.currentAlgorithm === "rectangleUnion" ||
    algorithmManager.currentAlgorithm === "rectangleIntersection"
  ) {
    // Remove rectangle
    if (algorithm.rectangles) {
      for (let i = algorithm.rectangles.length - 1; i >= 0; i--) {
        const rectangle = algorithm.rectangles[i];
        if (
          canvasX >= rectangle.x1 &&
          canvasX <= rectangle.x2 &&
          canvasY >= rectangle.y1 &&
          canvasY <= rectangle.y2
        ) {
          algorithmManager.removeRectangle(rectangle);
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          return;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "artGallery") {
    // Remove polygon vertex (only if polygon is not complete)
    if (
      algorithm.polygon &&
      !algorithm.polygon.isComplete &&
      algorithm.polygon.vertices
    ) {
      for (let i = algorithm.polygon.vertices.length - 1; i >= 0; i--) {
        const vertex = algorithm.polygon.vertices[i];
        const distance = dist(canvasX, canvasY, vertex.x, vertex.y);
        if (distance < clickRadius) {
          algorithm.polygon.vertices.splice(i, 1);
          // Update polygon state so preview edge no longer draws
          if (algorithm.polygon.vertices.length < 3)
            algorithm.polygon.isComplete = false;
          algorithm.polygon.updateEdges();
          // Clear algorithm steps/state because geometry changed
          algorithm.steps = [];
          algorithm.currentStep = 0;
          uiControls.updateButtons();
          uiControls.updateStepInfo();
          break;
        }
      }
    }
  } else {
    // Remove point
    let points = [];
    if (algorithm.points) {
      points = algorithm.points;
    } else if (algorithm.polygon && algorithm.polygon.vertices) {
      points = algorithm.polygon.vertices;
    }

    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i];
      const distance = dist(canvasX, canvasY, point.x, point.y);
      if (distance < clickRadius) {
        // If we're removing from a polygon, update polygon edges/state
        if (algorithm.polygon && algorithm.polygon.vertices) {
          const idx = algorithm.polygon.vertices.findIndex(
            (v) => Math.abs(v.x - point.x) < 10 && Math.abs(v.y - point.y) < 10
          );
          if (idx !== -1) {
            algorithm.polygon.vertices.splice(idx, 1);
            if (algorithm.polygon.vertices.length < 3)
              algorithm.polygon.isComplete = false;
            algorithm.polygon.updateEdges();
            // Clear algorithm steps/state because geometry changed
            if (algorithm.steps) algorithm.steps = [];
            if (typeof algorithm.currentStep !== "undefined")
              algorithm.currentStep = 0;
            uiControls.updateButtons();
            uiControls.updateStepInfo();
            break;
          }
        }

        // Fallback to generic removal API
        algorithmManager.removePoint(point);
        uiControls.updateButtons();
        uiControls.updateStepInfo();
        break;
      }
    }
  }
}

function distanceToLineSegment(px, py, segment) {
  return window.Utils.distanceToLineSegment(px, py, segment);
}

function distanceToLine(px, py, lineObj) {
  // Delegate to shared utils
  return window.Utils.distanceToLine(px, py, lineObj);
}

// Duality helpers: compute (point -> dual-line) and (line -> dual-point) mappings
function pointToDualLine(point) {
  // Same math as drawDuality: map world coords -> math coords, using viewport center
  const unit = 50;
  const cxW = (width / 2 - canvasTransform.x) / canvasTransform.scale;
  const cyW = (height / 2 - canvasTransform.y) / canvasTransform.scale;
  const worldToMath = (xw, yw) => ({
    x: (xw - cxW) / unit,
    y: (cyW - yw) / unit,
  });
  const pm = worldToMath(point.x, point.y);
  const m = pm.x;
  const c = -pm.y;
  return { m: m, c: c };
}

function lineToDualPoint(lineObj) {
  // Sample visible world x bounds and map to math coords to compute slope/intercept
  const unit = 50;
  const xMinW = (0 - canvasTransform.x) / canvasTransform.scale;
  const xMaxW = (width - canvasTransform.x) / canvasTransform.scale;
  const cxW = (width / 2 - canvasTransform.x) / canvasTransform.scale;
  const cyW = (height / 2 - canvasTransform.y) / canvasTransform.scale;
  const worldToMath = (xw, yw) => ({
    x: (xw - cxW) / unit,
    y: (cyW - yw) / unit,
  });

  const s0 = { x: xMinW, y: lineObj.getY(xMinW) };
  const s1 = { x: xMaxW, y: lineObj.getY(xMaxW) };
  const m0 = worldToMath(s0.x, s0.y);
  const m1 = worldToMath(s1.x, s1.y);
  const dm = (m1.y - m0.y) / (m1.x - m0.x || 1e-6);
  const dc = m0.y - dm * m0.x;
  // Dual point in math coords is (m, -c)
  return { m: dm, negC: -dc };
}

// Tooltip formatting helpers - shortcuts - delegate to Utils
function formatPoint(p) {
  return window.Utils.formatPoint(p);
}

function formatSigned(v) {
  return window.Utils.formatSigned(v);
}

function formatDualLineEquation(m, c) {
  return window.Utils.formatDualLineEquation(m, c);
}

function checkHover(canvasX, canvasY) {
  // DEBUG: If the topmost element under the pointer is an overlay
  // (control-overlay or panel-overlay), skip hover detection so nothing
  // from the canvas (tooltips, highlights) activates while the user is
  // interacting with UI chrome.
  try {
    const el = document.elementFromPoint(mouseX, mouseY);
    if (el) {
      if (
        el.closest &&
        (el.closest(".control-overlay") ||
          el.closest(".panel-overlay") ||
          el.closest("#top-left-overlays"))
      ) {
        hideTooltip();
        return;
      }
    }
  } catch (e) {
    // pass - e.g., during setup when mouseX/mouseY may be undefined
  }
  const algorithm = algorithmManager.getCurrentAlgorithm();
  const hoverRadius = 15 / canvasTransform.scale; // Adjust for zoom level

  // Reset hover state
  hoverState.hoveredPoint = null;
  hoverState.hoveredSegment = null;
  hoverState.hoveredInterval = null;
  hoverState.hoveredLine = null;
  hoverState.hoveredRectangle = null;

  // First: check algorithm-provided interactive elements (intersections, circumcenters, sites, etc.)
  const step = algorithm.getCurrentStep
    ? algorithm.getCurrentStep()
    : algorithm.steps
    ? algorithm.steps[algorithm.currentStep]
    : null;

  const interactiveElements = getInteractiveElementsForAlgorithm(
    algorithmManager.currentAlgorithm,
    step
  );

  // Hover detection and Tooltips for various interactive elements
  for (let i = 0; i < interactiveElements.length; i++) {
    const el = interactiveElements[i];
    if (el.type === "point") {
      const px = el.obj.x;
      const py = el.obj.y;
      const distance = dist(canvasX, canvasY, px, py);
      if (distance < hoverRadius) {
        // Use hoveredPoint for compatibility with draw helpers
        hoverState.hoveredPoint = { point: el.obj, index: i };
        showTooltip(el.tooltip(el.obj, i), mouseX, mouseY);
        return;
      }
    } else if (el.type === "segment") {
      if (distanceToLineSegment(canvasX, canvasY, el.obj) < hoverRadius) {
        hoverState.hoveredSegment = { segment: el.obj, index: i };
        showTooltip(el.tooltip(el.obj, i), mouseX, mouseY);
        return;
      }
    } else if (el.type === "line") {
      if (distanceToLine(canvasX, canvasY, el.obj) < hoverRadius) {
        hoverState.hoveredLine = { line: el.obj, index: i };
        showTooltip(el.tooltip(el.obj, i), mouseX, mouseY);
        return;
      }
    } else if (el.type === "rectangle") {
      const r = el.obj;
      if (
        canvasX >= r.x1 &&
        canvasX <= r.x2 &&
        canvasY >= r.y1 &&
        canvasY <= r.y2
      ) {
        hoverState.hoveredRectangle = { rectangle: r, index: i };
        showTooltip(el.tooltip(el.obj, i), mouseX, mouseY);
        return;
      }
    }
  }

  if (algorithmManager.currentAlgorithm === "segmentIntersection") {
    // Check for hovered segments
    if (algorithm.segments) {
      for (let i = 0; i < algorithm.segments.length; i++) {
        const segment = algorithm.segments[i];
        if (distanceToLineSegment(canvasX, canvasY, segment) < hoverRadius) {
          hoverState.hoveredSegment = { segment, index: i };
          showTooltip(
            `Line ${i + 1}: (${segment.p1.x.toFixed(1)}, ${segment.p1.y.toFixed(
              1
            )}) → (${segment.p2.x.toFixed(1)}, ${segment.p2.y.toFixed(1)})`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "intervalTree") {
    // Check for hovered intervals (now stacked vertically)
    if (algorithm.intervals) {
      const numberLineY = height * 0.8;
      const numberLineStart = 50;
      const numberLineEnd = width - 50;
      const numberLineRange = 100;
      const intervalSpacing = 14;
      const intervalYOffset = 24;

      for (let i = 0; i < algorithm.intervals.length; i++) {
        const interval = algorithm.intervals[i];
        const startX =
          numberLineStart +
          (interval.start / numberLineRange) *
            (numberLineEnd - numberLineStart);
        const endX =
          numberLineStart +
          (interval.end / numberLineRange) * (numberLineEnd - numberLineStart);
        const intervalY = numberLineY - intervalYOffset - i * intervalSpacing;

        // Check if hover is within the stacked interval
        if (
          canvasX >= startX - hoverRadius &&
          canvasX <= endX + hoverRadius &&
          Math.abs(canvasY - intervalY) < hoverRadius
        ) {
          hoverState.hoveredInterval = { interval, index: i };
          showTooltip(
            `Interval ${i + 1}: [${interval.start.toFixed(
              1
            )}, ${interval.end.toFixed(1)}]`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "segmentTree") {
    // Hover intervals for segment tree (stacked similarly)
    if (algorithm.intervals) {
      const numberLineY = height * 0.8;
      const numberLineStart = 50;
      const numberLineEnd = width - 50;
      const numberLineRange = 100;
      const intervalSpacing = 14;
      const intervalYOffset = 24;
      for (let i = 0; i < algorithm.intervals.length; i++) {
        const interval = algorithm.intervals[i];
        const startX =
          numberLineStart +
          (interval.start / numberLineRange) *
            (numberLineEnd - numberLineStart);
        const endX =
          numberLineStart +
          (interval.end / numberLineRange) * (numberLineEnd - numberLineStart);
        const intervalY = numberLineY - intervalYOffset - i * intervalSpacing;
        if (
          canvasX >= startX - hoverRadius &&
          canvasX <= endX + hoverRadius &&
          Math.abs(canvasY - intervalY) < hoverRadius
        ) {
          hoverState.hoveredInterval = { interval, index: i };
          showTooltip(
            `Interval ${i + 1}: [${interval.start.toFixed(
              1
            )}, ${interval.end.toFixed(1)}]`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }
  } else if (algorithmManager.currentAlgorithm === "duality") {
    // Check for hovered points and lines (canvas-space)
    const rawHoverRadius = 15 / canvasTransform.scale;

    // First: check points
    if (algorithm.points) {
      for (let i = 0; i < algorithm.points.length; i++) {
        const point = algorithm.points[i];
        const distance = dist(canvasX, canvasY, point.x, point.y);
        if (distance < rawHoverRadius) {
          hoverState.hoveredPoint = { point, index: i };
          const mapped = pointToDualLine(point);
          showTooltip(
            `Point ${i + 1}: ${formatPoint(point)} → ${formatDualLineEquation(
              mapped.m,
              mapped.c
            )}`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }

    // Then: check lines
    if (algorithm.lines) {
      for (let i = 0; i < algorithm.lines.length; i++) {
        const lineObj = algorithm.lines[i];
        if (distanceToLine(canvasX, canvasY, lineObj) < rawHoverRadius) {
          hoverState.hoveredLine = { line: lineObj, index: i };
          const dualPt = lineToDualPoint(lineObj);
          showTooltip(
            `Line ${
              i + 1
            }: ${lineObj.toString()} → Dual point: (${dualPt.m.toFixed(
              2
            )}, ${dualPt.negC.toFixed(2)})`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }
  } else if (
    algorithmManager.currentAlgorithm === "rectangleUnion" ||
    algorithmManager.currentAlgorithm === "rectangleIntersection"
  ) {
    // Check for hovered rectangles
    if (algorithm.rectangles) {
      for (let i = 0; i < algorithm.rectangles.length; i++) {
        const rectangle = algorithm.rectangles[i];
        if (
          canvasX >= rectangle.x1 &&
          canvasX <= rectangle.x2 &&
          canvasY >= rectangle.y1 &&
          canvasY <= rectangle.y2
        ) {
          hoverState.hoveredRectangle = { rectangle, index: i };
          showTooltip(
            `Rectangle ${i + 1}: ${rectangle.toString()}`,
            mouseX,
            mouseY
          );
          return;
        }
      }
    }
  } else {
    // Check for hovered points
    let points = [];
    if (algorithm.points) {
      points = algorithm.points;
    } else if (algorithm.polygon && algorithm.polygon.vertices) {
      points = algorithm.polygon.vertices;
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const distance = dist(canvasX, canvasY, point.x, point.y);
      if (distance < hoverRadius) {
        hoverState.hoveredPoint = { point, index: i };
        showTooltip(
          `Point ${i + 1}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`,
          mouseX,
          mouseY
        );
        return;
      }
    }
  }

  // No hover detected
  hideTooltip();
}

// Shows tooltip at mouse position with given text
function showTooltip(text, x, y) {
  const tooltip = document.getElementById("canvas-tooltip");
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.style.left = x + 10 + "px";
    tooltip.style.top = y - 30 + "px";
    tooltip.style.display = "block";
    hoverState.tooltipVisible = true;
    hoverState.tooltipText = text;
    hoverState.tooltipX = x;
    hoverState.tooltipY = y;
  }
}

// Hides the tooltip and resets hover state
function hideTooltip() {
  const tooltip = document.getElementById("canvas-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
    hoverState.tooltipVisible = false;
    hoverState.hoveredPoint = null;
    hoverState.hoveredSegment = null;
    hoverState.hoveredInterval = null;
    hoverState.hoveredLine = null;
    hoverState.hoveredRectangle = null;
  }
}

// Draws a point with hover effects
function drawPointWithHover(
  point,
  pointSize,
  index, // Used by algos
  currentFill,
  currentStroke
) {
  const isHovered =
    hoverState.hoveredPoint && hoverState.hoveredPoint.point === point;

  // Apply current colors
  fill(currentFill);
  stroke(currentStroke);

  if (isHovered) {
    strokeWeight(4);
    drawingContext.shadowColor = "rgba(255, 255, 255, 0.8)";
    drawingContext.shadowBlur = 8;
    ellipse(point.x, point.y, pointSize + 4);
    drawingContext.shadowBlur = 0;
  } else {
    strokeWeight(2);
    ellipse(point.x, point.y, pointSize + 2);
  }
}

// Helper: return {fillColor, strokeColor} for point based on status and theme
function getPointColors(status) {
  // status: 'default' | 'current' | 'dual' | other semantic hints
  if (status === "current") {
    // Bright yellow for current point; keep same both themes
    return { fillColor: [255, 255, 0], strokeColor: [255, 200, 0] };
  }

  if (status === "dual") {
    if (darkMode)
      return { fillColor: [255, 150, 255], strokeColor: [200, 100, 200] };
    return { fillColor: [255, 100, 255], strokeColor: [200, 50, 200] };
  }

  // Default points: use lighter tints in dark mode
  if (darkMode)
    return { fillColor: [120, 170, 255], strokeColor: [80, 120, 220] };
  return { fillColor: [0, 100, 255], strokeColor: [0, 50, 200] };
}

// Build a list of interactive elements for hover detection for the given algorithm and step
function getInteractiveElementsForAlgorithm(algorithmName, step) {
  const elems = [];
  if (!step) return elems;
  // Generic: include intersections if present (many algorithms report these)
  if (step.intersections && step.intersections.length > 0) {
    for (let i = 0; i < step.intersections.length; i++) {
      const intr = step.intersections[i];
      if (intr && intr.x !== undefined && intr.y !== undefined) {
        elems.push({
          type: "point",
          obj: intr,
          tooltip: (o, idx) =>
            `Intersection ${idx + 1}: (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`,
        });
      }
    }
  }

  // Generic: include circumcircles/circumcenters if present
  if (step.circumcenters && step.circumcenters.length > 0) {
    for (let i = 0; i < step.circumcenters.length; i++) {
      const c = step.circumcenters[i];
      if (c && c.x !== undefined && c.y !== undefined) {
        elems.push({
          type: "point",
          obj: c,
          tooltip: (o) =>
            `Circumcenter: (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`,
        });
      }
    }
  }

  // Try to access the algorithm object for additional data
  const alg =
    typeof algorithmManager !== "undefined" && algorithmManager.algorithms
      ? algorithmManager.algorithms[algorithmName]
      : null;

  switch (algorithmName) {
    case "segmentIntersection":
      // Intersections (points)
      if (step.intersections && step.intersections.length > 0) {
        for (const intr of step.intersections) {
          elems.push({
            type: "point",
            obj: intr,
            tooltip: (o, i) =>
              `Intersection ${i + 1}: (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`,
          });
        }
      }
      // Active segments
      if (step.activeSegments && step.activeSegments.length > 0) {
        for (const seg of step.activeSegments) {
          elems.push({
            type: "segment",
            obj: seg,
            tooltip: (o, i) =>
              `Segment: (${o.p1.x.toFixed(1)}, ${o.p1.y.toFixed(
                1
              )}) → (${o.p2.x.toFixed(1)}, ${o.p2.y.toFixed(1)})`,
          });
        }
      }
      break;

    case "quickHull":
    case "grahamScan":
      // Farthest point (if present)
      if (step.farthestPoint) {
        elems.push({
          type: "point",
          obj: step.farthestPoint,
          tooltip: (o) =>
            `Farthest point: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
        });
      }
      break;

    case "giftWrap":
    case "grahamScan":
      // Many hull-style algorithms expose eventSets.points
      if (
        step.eventSets &&
        step.eventSets.points &&
        step.eventSets.points.length
      ) {
        for (let i = 0; i < step.eventSets.points.length; i++) {
          const pd = step.eventSets.points[i];
          const p = pd.point || pd;
          elems.push({
            type: "point",
            obj: p,
            tooltip: (o, idx) =>
              `Point ${idx + 1} (${pd.status || ""}): (${o.x.toFixed(
                1
              )}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;

    case "delaunay":
    case "voronoi":
    case "fortuneVoronoi":
      // circumcenters / circumcenters list and sites
      if (step.circumcenters && step.circumcenters.length > 0) {
        for (const center of step.circumcenters) {
          elems.push({
            type: "point",
            obj: center,
            tooltip: (o, i) =>
              `Circumcenter: (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`,
          });
        }
      }
      if (step.partialCells && step.partialCells.length > 0) {
        for (const cell of step.partialCells) {
          elems.push({
            type: "point",
            obj: cell.site,
            tooltip: (o, i) => `Site: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      if (step.voronoiCells && step.voronoiCells.length > 0) {
        for (const cell of step.voronoiCells) {
          elems.push({
            type: "point",
            obj: cell.site,
            tooltip: (o, i) => `Site: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;

    case "triangle":
    case "triangulation":
      if (step.triangles && step.triangles.length > 0) {
        for (const tri of step.triangles) {
          for (const v of tri) {
            elems.push({
              type: "point",
              obj: v,
              tooltip: (o) => `Vertex: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
            });
          }
        }
      }
      break;

    case "quickHull":
      // current farthest point handled above; also include hull vertices when present
      if (step.hull && step.hull.length > 0) {
        for (const v of step.hull) {
          elems.push({
            type: "point",
            obj: v,
            tooltip: (o) =>
              `Hull vertex: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;

    case "rectangleUnion":
    case "rectangleIntersection":
      if (step.rectangles && step.rectangles.length > 0) {
        for (const rect of step.rectangles) {
          elems.push({
            type: "rectangle",
            obj: rect,
            tooltip: (o, i) =>
              `Rectangle ${i + 1}: (${o.x1.toFixed(1)}, ${o.y1.toFixed(
                1
              )}) → (${o.x2.toFixed(1)}, ${o.y2.toFixed(1)})`,
          });
        }
      }
      break;

    case "segmentTree":
    case "intervalTree":
      if (step.intervals && step.intervals.length > 0) {
        for (const interval of step.intervals) {
          elems.push({
            type: "point",
            obj: { x: interval.start, y: 0 },
            tooltip: (o, i) =>
              `Interval ${i + 1}: [${interval.start.toFixed(
                1
              )}, ${interval.end.toFixed(1)}]`,
          });
        }
      }
      // Tree nodes: some steps expose nodes or eventSets.nodes
      if (step.nodes && step.nodes.length) {
        for (const nd of step.nodes) {
          if (nd && nd.x !== undefined && nd.y !== undefined) {
            elems.push({
              type: "point",
              obj: nd,
              tooltip: (o) => `Node median: ${o.median}`,
            });
          }
        }
      }
      if (
        step.eventSets &&
        step.eventSets.nodes &&
        step.eventSets.nodes.length
      ) {
        for (const ndItem of step.eventSets.nodes) {
          if (ndItem.node && ndItem.node.x !== undefined) {
            elems.push({
              type: "point",
              obj: ndItem.node,
              tooltip: (o) => `Node [${ndItem.node.l}, ${ndItem.node.r}]`,
            });
          }
        }
      }
      break;

    case "duality":
      // Use algorithm-level points and lines, if available
      if (alg && alg.points && alg.points.length) {
        for (let i = 0; i < alg.points.length; i++) {
          const p = alg.points[i];
          const mapped = pointToDualLine(p);
          elems.push({
            type: "point",
            obj: p,
            tooltip: (o, idx) =>
              `Point ${idx + 1}: ${formatPoint(o)} → ${formatDualLineEquation(
                mapped.m,
                mapped.c
              )}`,
          });
        }
      }
      if (alg && alg.lines && alg.lines.length) {
        for (let i = 0; i < alg.lines.length; i++) {
          const l = alg.lines[i];
          const dualPt = lineToDualPoint(l);
          elems.push({
            type: "line",
            obj: l,
            tooltip: (o, idx) =>
              `Line ${
                idx + 1
              }: ${o.toString()} → Dual point: (${dualPt.m.toFixed(
                2
              )}, ${dualPt.negC.toFixed(2)})`,
          });
        }
      }

      // ALSO: include the visual duals themselves so hovering the drawn
      // dual lines/points (which are computed ephemeral coords) triggers tooltips.
      // Compute world-space representations for those visuals using the same
      // viewport math as drawDuality().
      try {
        const unit = 50;
        const cxW = (width / 2 - canvasTransform.x) / canvasTransform.scale;
        const cyW = (height / 2 - canvasTransform.y) / canvasTransform.scale;

        // Dual lines (visuals produced from source points): add as 'line' objects
        if (alg && alg.points && alg.points.length) {
          for (let i = 0; i < alg.points.length; i++) {
            const p = alg.points[i];
            const mapped = pointToDualLine(p); // math m,c
            // Convert math line y = m*x + c into world-space line parameters:
            // world_y = cyW - unit*(m*((xw - cxW)/unit) + c) = (-m)*xw + (cyW + m*cxW - unit*c)
            const slopeW = -mapped.m;
            const interceptW = cyW + mapped.m * cxW - unit * mapped.c;
            const visualLine = {
              slope: slopeW,
              intercept: interceptW,
              getY: (xw) => slopeW * xw + interceptW,
            };
            elems.push({
              type: "line",
              obj: visualLine,
              tooltip: (o, idx) =>
                `Dual line D${i + 1}: ${formatDualLineEquation(
                  mapped.m,
                  mapped.c
                )} (from P${i + 1})`,
            });
          }
        }

        // Dual points (visuals produced from source lines): add as 'point' objects
        if (alg && alg.lines && alg.lines.length) {
          for (let i = 0; i < alg.lines.length; i++) {
            const l = alg.lines[i];
            const dualPm = lineToDualPoint(l); // { m, negC } in math coords
            const dualWorld = {
              x: cxW + dualPm.m * unit,
              y: cyW - dualPm.negC * unit,
            };
            elems.push({
              type: "point",
              obj: dualWorld,
              tooltip: (o, idx) =>
                `Dual point DP${i + 1}: (${o.x.toFixed(2)}, ${o.y.toFixed(
                  2
                )}) (from L${i + 1})`,
            });
          }
        }
      } catch (e) {
        // pass - if canvasTransform/width/height aren't available for some reason,
        // skip adding the visual duals (non-fatal).
      }
      break;

    case "giftWrap":
      // eventSets handled earlier; also fall back to algorithm.points
      if (alg && alg.points && alg.points.length) {
        for (let i = 0; i < alg.points.length; i++) {
          const p = alg.points[i];
          elems.push({
            type: "point",
            obj: p,
            tooltip: (o, idx) =>
              `Point ${idx + 1}: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;

    case "artGallery":
      // polygon vertices
      if (
        alg &&
        alg.polygon &&
        alg.polygon.vertices &&
        alg.polygon.vertices.length
      ) {
        for (const v of alg.polygon.vertices) {
          elems.push({
            type: "point",
            obj: v,
            tooltip: (o) => `Vertex: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;

    default:
      // Generic points collection
      if (step.points && step.points.length > 0) {
        for (let i = 0; i < step.points.length; i++) {
          const p = step.points[i];
          elems.push({
            type: "point",
            obj: p,
            tooltip: (o, idx) =>
              `Point ${idx + 1}: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      // Also include polygon vertices, if present
      if (step.polygon && step.polygon.vertices) {
        for (const v of step.polygon.vertices) {
          elems.push({
            type: "point",
            obj: v,
            tooltip: (o) => `Vertex: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }

      // New point highlighted for some algorithms
      if (step.newPoint) {
        elems.push({
          type: "point",
          obj: step.newPoint,
          tooltip: (o) => `New point: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
        });
      }
      // Current ear vertices (triangulation)
      if (step.currentEar && step.currentEar.length) {
        for (const v of step.currentEar) {
          elems.push({
            type: "point",
            obj: v,
            tooltip: (o) =>
              `Ear vertex: (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`,
          });
        }
      }
      break;
  }

  return elems;
}

// Helper function to set line dash pattern
function setLineDash(pattern) {
  const ctx = canvas.canvas.getContext("2d");
  ctx.setLineDash(pattern);
}

// Helper function to draw text with appropriate color based on dark mode
function drawText(txt, x, y, size = 14, align = [LEFT, TOP]) {
  fill(darkMode ? 255 : 0); // White text in dark mode, black in light mode
  noStroke();
  textSize(size);
  textAlign(align[0], align[1]);
  text(txt, x, y);
}

// Helper function to recursively draw nodes in a tree
function drawTreeNode(
  node,
  x,
  y,
  spacing,
  step,
  numberLineStart,
  numberLineEnd,
  numberLineRange,
  level,
  verticalGap,
  maxMiniRows
) {
  if (!node) return;

  node.x = x;
  node.y = y;

  // Highlight current node, if applicable
  const isCurrentNode =
    step.currentNode && step.currentNode.median === node.median;

  // Node size (compact, clamped)
  const nodeRadius = Math.min(
    48,
    Math.max(26, 26 + Math.min(node.centerIntervals.length, 5) * 4)
  );

  // Node body
  if (isCurrentNode) {
    fill(255, 255, 0, 200);
    stroke(255, 200, 0);
    strokeWeight(2.5);
  } else {
    fill(200, 210, 255, 200);
    stroke(100, 120, 210);
    strokeWeight(2);
  }
  // Node body (draw as ellipse with contrasting text)
  ellipse(x, y, nodeRadius);

  // Labels inside node
  fill(darkMode ? 0 : 0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(10.5);
  text(`M: ${node.median.toFixed(1)}`, x, y - 6);
  text(`${node.centerIntervals.length} intv`, x, y + 7);

  // Mini interval ticks below the node (limited rows to avoid overflow)
  if (node.centerIntervals.length > 0) {
    const rowYStart = y + nodeRadius / 2 + 10;
    const shown = Math.min(node.centerIntervals.length, maxMiniRows);
    const miniWidth = Math.min(nodeRadius * 1.2, 70);
    for (let i = 0; i < shown; i++) {
      const interval = node.centerIntervals[i];
      const ratio = Math.max(
        0.02,
        (interval.end - interval.start) / numberLineRange
      );
      const w = Math.max(6, ratio * miniWidth);
      const rX = x - w / 2;
      const rY = rowYStart + i * 9;
      fill(255, 120, 120, 160);
      stroke(255, 80, 80);
      strokeWeight(1.5);
      rect(rX, rY - 3, w, 6, 3);
    }
    if (node.centerIntervals.length > shown) {
      fill(darkMode ? 255 : 0);
      noStroke();
      textSize(9);
      text(
        `+${node.centerIntervals.length - shown} more`,
        x,
        rowYStart + shown * 9
      );
    }
  }

  // Children connections and recursion
  const childY = y + verticalGap;
  if (node.left) {
    stroke(120);
    strokeWeight(1.5);
    line(x, y + nodeRadius / 2, x - spacing, childY - 16);
    drawTreeNode(
      node.left,
      x - spacing,
      childY,
      Math.max(20, spacing / 2),
      step,
      numberLineStart,
      numberLineEnd,
      numberLineRange,
      level + 1,
      verticalGap,
      maxMiniRows
    );
  }
  if (node.right) {
    stroke(120);
    strokeWeight(1.5);
    line(x, y + nodeRadius / 2, x + spacing, childY - 16);
    drawTreeNode(
      node.right,
      x + spacing,
      childY,
      Math.max(20, spacing / 2),
      step,
      numberLineStart,
      numberLineEnd,
      numberLineRange,
      level + 1,
      verticalGap,
      maxMiniRows
    );
  }
}

/**
 * NOTE: Drawing functions for the various algorithms
 **/

/**
 * ArtGallery drawing function
 */
function drawArtGallery(step, pointSize) {
  // Allow drawing even when no computed steps exist yet (live polygon building)
  // 'step' may be null/undefined until the algorithm runs.

  const algorithm = algorithmManager.getCurrentAlgorithm();

  // Draw the polygon being constructed
  if (algorithm.polygon && algorithm.polygon.vertices.length > 0) {
    // Draw polygon edges
    stroke(darkMode ? 200 : 100);
    strokeWeight(2);
    noFill();

    for (let edge of algorithm.polygon.edges) {
      line(edge.start.x, edge.start.y, edge.end.x, edge.end.y);
    }

    // Draw vertices
    fill(darkMode ? 255 : 0);
    noStroke();
    for (let vertex of algorithm.polygon.vertices) {
      circle(vertex.x, vertex.y, pointSize);
    }

    // If polygon is not complete, show preview line to mouse
    if (
      !algorithm.polygon.isComplete &&
      algorithm.polygon.vertices.length > 0
    ) {
      const lastVertex =
        algorithm.polygon.vertices[algorithm.polygon.vertices.length - 1];
      const canvasX = (mouseX - canvasTransform.x) / canvasTransform.scale;
      const canvasY = (mouseY - canvasTransform.y) / canvasTransform.scale;

      stroke(darkMode ? 150 : 150);
      strokeWeight(1);
      setLineDash([5, 5]);
      line(lastVertex.x, lastVertex.y, canvasX, canvasY);
      setLineDash([]);
    }
  }

  // Draw triangulation, if available
  if (step && step.triangulation && step.triangulation.length > 0) {
    stroke(darkMode ? 100 : 200);
    strokeWeight(1);
    noFill();

    for (let triangle of step.triangulation) {
      beginShape();
      for (let v of triangle) {
        // Use p5's vertex() for shape, avoid shadowing by loop variable
        vertex(v.x, v.y);
      }
      endShape(CLOSE);
    }
  }

  // Draw vertex coloring, if available
  if (step && step.coloring) {
    // High-contrast palette + contrasting outline, so that,
    // colors are visible on both light and dark backgrounds.
    const colors = [
      [220, 60, 60], // stronger red
      [60, 200, 80], // stronger green
      [70, 110, 240], // stronger blue
    ];

    // Determine outline color, based on background (darkMode)
    const outlineColor = darkMode ? [0, 0, 0] : [255, 255, 255];

    // step.coloring may be a Map, an Array, or an object mapping indices -> color
    const getColorForIndex = (idx) => {
      if (step.coloring instanceof Map) return step.coloring.get(idx);
      if (Array.isArray(step.coloring)) return step.coloring[idx];
      // object-like
      return step.coloring[idx];
    };

    for (let vi = 0; vi < algorithm.polygon.vertices.length; vi++) {
      const color = getColorForIndex(vi);
      if (color === undefined || color < 0 || color >= colors.length) continue;
      const vtx = algorithm.polygon.vertices[vi];
      if (!vtx) continue;

      // Ensure any leftover shadow is cleared to avoid halo/hollow artifacts
      try {
        drawingContext && (drawingContext.shadowBlur = 0);
      } catch (e) {}

      const innerDia = Math.max(2, pointSize * 1.0);
      const outerDia = Math.max(innerDia + 4, pointSize * 1.6);

      // Draw filled inner circle first
      noStroke();
      fill(colors[color][0], colors[color][1], colors[color][2]);
      circle(vtx.x, vtx.y, innerDia);

      // Draw contrasting outline as stroke-only ring
      noFill();
      stroke(outlineColor[0], outlineColor[1], outlineColor[2]);
      strokeWeight(Math.max(1, Math.round(pointSize * 0.15)));
      circle(vtx.x, vtx.y, outerDia);

      // Small center dot (same as outline color) to avoid any transparent center
      noStroke();
      fill(outlineColor[0], outlineColor[1], outlineColor[2]);
      circle(vtx.x, vtx.y, Math.max(1, Math.round(pointSize * 0.25)));
    }
  }

  // Draw guards
  if (step && step.guards && step.guards.length > 0) {
    // Draw guard positions robustly (guard may be {x,y}, {point:{x,y}}, [x,y], or vertex index)
    const guardFill = [255, 215, 0]; // gold
    const guardOutline = darkMode ? [0, 0, 0] : [255, 255, 255];
    const pupilColor = darkMode ? [0, 0, 0] : [40, 40, 40];

    const getGuardPos = (g) => {
      if (!g) return null;
      if (typeof g.x === "number" && typeof g.y === "number")
        return { x: g.x, y: g.y };
      if (
        g.point &&
        typeof g.point.x === "number" &&
        typeof g.point.y === "number"
      )
        return { x: g.point.x, y: g.point.y };
      if (Array.isArray(g) && g.length >= 2 && typeof g[0] === "number")
        return { x: g[0], y: g[1] };
      // If guard is an index into polygon vertices
      if (
        typeof g === "number" &&
        algorithm.polygon &&
        algorithm.polygon.vertices &&
        algorithm.polygon.vertices[g]
      ) {
        const v = algorithm.polygon.vertices[g];
        return { x: v.x, y: v.y };
      }
      // Fallback: try to find x,y properties with string keys
      if (typeof g["x"] === "number" && typeof g["y"] === "number")
        return { x: g["x"], y: g["y"] };
      return null;
    };

    // Draw 😶 (face without mouth)
    for (let guard of step.guards) {
      const pos = getGuardPos(guard);
      if (!pos) continue;

      const gx = pos.x;
      const gy = pos.y;
      const bodyDia = Math.max(6, pointSize * 1.5);

      // Body (filled)
      noStroke();
      fill(guardFill[0], guardFill[1], guardFill[2]);
      circle(gx, gy, bodyDia);

      // Outline ring for contrast
      noFill();
      stroke(guardOutline[0], guardOutline[1], guardOutline[2]);
      strokeWeight(Math.max(1, Math.round(pointSize * 0.2)));
      circle(gx, gy, Math.max(bodyDia + 4, bodyDia * 1.2));

      // Eyes / pupils
      const eyeOffsetX = Math.max(2, Math.round(pointSize * 0.2));
      const eyeOffsetY = Math.max(1, Math.round(pointSize * 0.15));
      const eyeDia = Math.max(2, Math.round(pointSize * 0.35));

      // Eye whites (contrasting to body) - draw small circles then pupils
      noStroke();
      fill(darkMode ? 220 : 255);
      circle(gx - eyeOffsetX, gy - eyeOffsetY, eyeDia);
      circle(gx + eyeOffsetX, gy - eyeOffsetY, eyeDia);

      // Pupils
      noStroke();
      fill(pupilColor[0], pupilColor[1], pupilColor[2]);
      circle(
        gx - eyeOffsetX,
        gy - eyeOffsetY,
        Math.max(1, Math.round(eyeDia * 0.45))
      );
      circle(
        gx + eyeOffsetX,
        gy - eyeOffsetY,
        Math.max(1, Math.round(eyeDia * 0.45))
      );
    }
  }

  // Draw visibility regions
  if (step && step.visibilityRegions && step.visibilityRegions.length > 0) {
    const visibilityColors = [
      [255, 100, 100, 50], // Semi-transparent red
      [100, 255, 100, 50], // Semi-transparent green
      [100, 100, 255, 50], // Semi-transparent blue
    ];

    for (let i = 0; i < step.visibilityRegions.length; i++) {
      const region = step.visibilityRegions[i];
      const colorIndex = i % visibilityColors.length;

      fill(
        visibilityColors[colorIndex][0],
        visibilityColors[colorIndex][1],
        visibilityColors[colorIndex][2],
        visibilityColors[colorIndex][3]
      );
      noStroke();

      // Draw visibility area as points (simplified)
      for (let point of region.visibleArea) {
        circle(point.x, point.y, 2);
      }
    }
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Line Sweep - Segment Intersection drawing function
 */
function drawSegmentIntersection(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.segmentIntersection;

  // Draw all segments with appropriate colors based on their status
  for (let i = 0; i < algorithm.segments.length; i++) {
    const seg = algorithm.segments[i];
    let segmentStatus = "pending";

    // Check segment status from event sets, if available
    if (step.eventSets && step.eventSets.segments) {
      const segmentData = step.eventSets.segments.find((s) => s.index === i);
      if (segmentData) {
        segmentStatus = segmentData.status;
      }
    }

    // Check if this segment is being hovered
    const isHovered =
      hoverState.hoveredSegment && hoverState.hoveredSegment.segment === seg;

    // Set color and weight based on status
    switch (segmentStatus) {
      case "active":
        stroke(0, 255, 0);
        strokeWeight(isHovered ? 5 : 3);
        break;
      case "intersecting":
        stroke(255, 0, 0);
        strokeWeight(isHovered ? 5 : 3);
        break;
      case "current":
        stroke(255, 165, 0);
        strokeWeight(isHovered ? 5 : 3);
        break;
      case "processed":
        stroke(100, 100, 255);
        strokeWeight(isHovered ? 4 : 2);
        break;
      default:
        stroke(100);
        strokeWeight(isHovered ? 4 : 2);
    }

    // Add hover highlighting with glow effect
    if (isHovered) {
      drawingContext.shadowColor = "rgba(255, 255, 255, 0.6)";
      drawingContext.shadowBlur = 6;
    }

    // Draw the segment
    line(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);

    // Reset shadow
    if (isHovered) {
      drawingContext.shadowBlur = 0;
    }
  }

  // Draw line being dragged
  if (isDragging && dragStart) {
    const currentX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const currentY = (mouseY - canvasTransform.y) / canvasTransform.scale;
    stroke(255, 165, 0); // Orange color for preview
    strokeWeight(2);
    drawingContext.setLineDash([5, 5]); // Dashed line
    line(dragStart.x, dragStart.y, currentX, currentY);
    drawingContext.setLineDash([]); // Reset to solid line
  }

  // Draw sweep line
  if (step.sweepLine !== undefined) {
    stroke(255, 0, 0);
    strokeWeight(1);
    line(step.sweepLine, 0, step.sweepLine, height);
  }

  // Draw intersections (keeps red emphasis but supports hover)
  if (step.intersections && step.intersections.length > 0) {
    for (let i = 0; i < step.intersections.length; i++) {
      const intersection = step.intersections[i];
      const intrFill = [255, 0, 0];
      const intrStroke = [200, 0, 0];
      drawPointWithHover(intersection, pointSize + 4, i, intrFill, intrStroke);
    }
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Line Sweep - Area of Union of Rectangles - drawing function
 */
function drawRectangleUnion(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.rectangleUnion;

  // Draw all rectangles
  if (step.rectangles && step.rectangles.length > 0) {
    for (let i = 0; i < step.rectangles.length; i++) {
      const rectangle = step.rectangles[i];
      const isHovered =
        hoverState.hoveredRectangle &&
        hoverState.hoveredRectangle.rectangle === rectangle;
      const isActive =
        step.activeRectangles && step.activeRectangles.includes(rectangle);

      // Set color based on status
      if (isActive) {
        fill(255, 255, 0, 100);
        stroke(255, 200, 0);
        strokeWeight(3);
      } else {
        fill(100, 150, 255, 100);
        stroke(0, 100, 200);
        strokeWeight(2);
      }

      if (isHovered) {
        strokeWeight(4);
        drawingContext.shadowColor = "rgba(255, 255, 255, 0.8)";
        drawingContext.shadowBlur = 8;
      }

      rect(rectangle.x1, rectangle.y1, rectangle.width, rectangle.height);

      // Draw rectangle label
      fill(darkMode ? 255 : 0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(12);
      text(`R${i + 1}`, rectangle.center.x, rectangle.center.y);

      drawingContext.shadowBlur = 0;
    }
  }

  // Draw sweep line
  if (step.sweepLine !== null && step.sweepLine !== undefined) {
    stroke(255, 0, 0);
    strokeWeight(2);
    line(step.sweepLine, 0, step.sweepLine, height);

    // Draw sweep line label
    fill(255, 0, 0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(12);
    text(`Sweep: ${step.sweepLine.toFixed(1)}`, step.sweepLine + 5, 10);
  }

  // Draw rectangle being dragged
  if (
    isDragging &&
    dragStart &&
    algorithmManager.currentAlgorithm === "rectangleUnion"
  ) {
    const currentX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const currentY = (mouseY - canvasTransform.y) / canvasTransform.scale;

    stroke(255, 165, 0);
    strokeWeight(2);
    fill(255, 165, 0, 50);
    drawingContext.setLineDash([5, 5]);

    const rectX = Math.min(dragStart.x, currentX);
    const rectY = Math.min(dragStart.y, currentY);
    const rectW = Math.abs(currentX - dragStart.x);
    const rectH = Math.abs(currentY - dragStart.y);

    rect(rectX, rectY, rectW, rectH);
    drawingContext.setLineDash([]);
  }

  // Draw area information
  if (step.totalArea > 0) {
    fill(darkMode ? 255 : 0);
    noStroke();
    textAlign(RIGHT, TOP);
    textSize(18);
    text(`Total Union Area: ${step.totalArea.toFixed(1)}`, width - 10, 10);
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Line Sweep - Area of Intersection of Rectangles - drawing function
 */
function drawRectangleIntersection(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.rectangleIntersection;

  // Draw all rectangles
  if (step.rectangles && step.rectangles.length > 0) {
    for (let i = 0; i < step.rectangles.length; i++) {
      const rectangle = step.rectangles[i];
      const isHovered =
        hoverState.hoveredRectangle &&
        hoverState.hoveredRectangle.rectangle === rectangle;
      const isActive =
        step.activeRectangles && step.activeRectangles.includes(rectangle);

      // Set color based on status
      if (isActive) {
        fill(255, 255, 0, 100);
        stroke(255, 200, 0);
        strokeWeight(3);
      } else {
        fill(100, 150, 255, 100);
        stroke(0, 100, 200);
        strokeWeight(2);
      }

      if (isHovered) {
        strokeWeight(4);
        drawingContext.shadowColor = "rgba(255, 255, 255, 0.8)";
        drawingContext.shadowBlur = 8;
      }

      rect(rectangle.x1, rectangle.y1, rectangle.width, rectangle.height);

      // Draw rectangle label
      fill(darkMode ? 255 : 0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(12);
      text(`R${i + 1}`, rectangle.center.x, rectangle.center.y);

      drawingContext.shadowBlur = 0;
    }
  }

  // Draw intersection regions
  if (step.intersectionRegions && step.intersectionRegions.length > 0) {
    for (const region of step.intersectionRegions) {
      fill(255, 0, 0, 150);
      stroke(255, 0, 0);
      strokeWeight(3);
      rect(region.x1, region.y1, region.x2 - region.x1, region.y2 - region.y1);

      // Draw intersection label
      fill(255, 255, 255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(10);
      text(
        "INTERSECTION",
        (region.x1 + region.x2) / 2,
        (region.y1 + region.y2) / 2
      );
    }
  }

  // Draw sweep line
  if (step.sweepLine !== null && step.sweepLine !== undefined) {
    stroke(255, 0, 0);
    strokeWeight(2);
    line(step.sweepLine, 0, step.sweepLine, height);

    // Draw sweep line label
    fill(255, 0, 0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(12);
    text(`Sweep: ${step.sweepLine.toFixed(1)}`, step.sweepLine + 5, 10);
  }

  // Draw rectangle being dragged
  if (
    isDragging &&
    dragStart &&
    algorithmManager.currentAlgorithm === "rectangleIntersection"
  ) {
    const currentX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const currentY = (mouseY - canvasTransform.y) / canvasTransform.scale;

    stroke(255, 165, 0);
    strokeWeight(2);
    fill(255, 165, 0, 50);
    drawingContext.setLineDash([5, 5]);

    const rectX = Math.min(dragStart.x, currentX);
    const rectY = Math.min(dragStart.y, currentY);
    const rectW = Math.abs(currentX - dragStart.x);
    const rectH = Math.abs(currentY - dragStart.y);

    rect(rectX, rectY, rectW, rectH);
    drawingContext.setLineDash([]);
  }

  // Draw area information
  if (step.totalArea > 0) {
    fill(darkMode ? 255 : 0);
    noStroke();
    textAlign(RIGHT, TOP);
    textSize(18);
    text(
      `Total Intersection Area: ${step.totalArea.toFixed(1)}`,
      width - 10,
      10
    );
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Convex Hull - Graham Scan drawing function
 */
function drawGrahamScan(step, pointSize) {
  if (!step) return;

  // Draw all points with appropriate colors, based on their status
  if (step.eventSets && step.eventSets.points) {
    for (let i = 0; i < step.eventSets.points.length; i++) {
      const pointData = step.eventSets.points[i];
      const point = pointData.point;
      let pointStatus = pointData.status;

      // Check if this point is being hovered
      const isHovered =
        hoverState.hoveredPoint && hoverState.hoveredPoint.point === point;

      // Map status to colors (prefers helper defaults where sensible)
      let colors;
      switch (pointStatus) {
        case "accepted":
          colors = { fillColor: [0, 200, 0], strokeColor: [0, 150, 0] };
          break;
        case "rejected":
          colors = { fillColor: [150, 150, 150], strokeColor: [100, 100, 100] };
          break;
        case "current":
          colors = getPointColors("current");
          break;
        case "backtrack":
          colors = { fillColor: [155, 89, 182], strokeColor: [142, 68, 173] };
          break;
        default:
          colors = getPointColors("default");
      }

      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );

      // Reset shadow
      drawingContext.shadowBlur = 0;
    }
  }

  // Draw hull outline
  if (step.hull && step.hull.length > 1) {
    stroke(0, 0, 255);
    strokeWeight(3);
    noFill();
    beginShape();
    for (const point of step.hull) {
      vertex(point.x, point.y);
    }
    if (step.hull.length > 2) {
      endShape(CLOSE);
    } else {
      endShape();
    }
  }

  // Draw step information
  if (step.description) {
    if (showCanvasText)
      drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Convex Hull - Gift Wrap (Jarvis' March) drawing function
 */
function drawGiftWrap(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.giftWrap;

  // Draw all points with appropriate colors based on their status
  if (step.eventSets && step.eventSets.points) {
    for (let i = 0; i < step.eventSets.points.length; i++) {
      const pointData = step.eventSets.points[i];
      const point = pointData.point;
      let pointStatus = pointData.status;

      // Check if this point is being hovered
      const isHovered =
        hoverState.hoveredPoint && hoverState.hoveredPoint.point === point;

      // Resolve color using helper: map pointStatus to helper semantic
      let semantic = "default";
      if (pointStatus === "current") semantic = "current";
      else if (pointStatus === "accepted") semantic = "accepted";
      else if (pointStatus === "rejected") semantic = "rejected";
      else if (pointStatus === "candidate") semantic = "candidate";
      else if (pointStatus === "testing") semantic = "testing";

      // Map semantics to concrete colors (fallback to helper default)
      let colors;
      switch (semantic) {
        case "current":
          colors = getPointColors("current");
          break;
        case "accepted":
          colors = { fillColor: [0, 200, 0], strokeColor: [0, 150, 0] };
          break;
        case "rejected":
          colors = { fillColor: [150, 150, 150], strokeColor: [100, 100, 100] };
          break;
        case "candidate":
          colors = { fillColor: [255, 255, 0], strokeColor: [200, 200, 0] };
          break;
        case "testing":
          colors = { fillColor: [255, 0, 255], strokeColor: [200, 0, 200] };
          break;
        default:
          colors = getPointColors("default");
      }

      // Draw point with hover handling centralized
      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );

      // Reset shadow
      drawingContext.shadowBlur = 0;
    }
  }

  // Draw hull outline
  if (step.hull && step.hull.length > 1) {
    stroke(0, 0, 255);
    strokeWeight(3);
    noFill();
    beginShape();
    for (const point of step.hull) {
      vertex(point.x, point.y);
    }
    if (step.hull.length > 2) {
      endShape(CLOSE);
    } else {
      endShape();
    }
  }

  // Draw current line being tested
  if (step.currentLine) {
    stroke(255, 150, 0);
    strokeWeight(3);
    line(
      step.currentLine[0].x,
      step.currentLine[0].y,
      step.currentLine[1].x,
      step.currentLine[1].y
    );

    // Add arrow to show direction
    const dx = step.currentLine[1].x - step.currentLine[0].x;
    const dy = step.currentLine[1].y - step.currentLine[0].y;
    const angle = atan2(dy, dx);
    const arrowSize = 10;

    push();
    translate(step.currentLine[1].x, step.currentLine[1].y);
    rotate(angle);
    stroke(255, 150, 0);
    strokeWeight(2);
    line(0, 0, -arrowSize, -arrowSize / 2);
    line(0, 0, -arrowSize, arrowSize / 2);
    pop();
  }

  // Draw test line, if available
  if (step.testLine) {
    stroke(255, 0, 255);
    strokeWeight(2);
    drawingContext.setLineDash([5, 5]);
    line(
      step.testLine[0].x,
      step.testLine[0].y,
      step.testLine[1].x,
      step.testLine[1].y
    );
    drawingContext.setLineDash([]);
  }

  // Draw step information
  if (step.description) {
    if (showCanvasText)
      drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Convex Hull - Quickhull drawing function
 */
function drawQuickHull(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.quickHull;

  // Draw all points with appropriate colors based on their status
  if (step.eventSets && step.eventSets.points) {
    for (let i = 0; i < step.eventSets.points.length; i++) {
      const pointData = step.eventSets.points[i];
      const point = pointData.point;
      const pointStatus = pointData.status;

      // Map statuses to color arrays
      let colors;
      switch (pointStatus) {
        case "accepted":
          colors = { fillColor: [0, 200, 0], strokeColor: [0, 150, 0] };
          break;
        case "rejected":
          colors = { fillColor: [150, 150, 150], strokeColor: [100, 100, 100] };
          break;
        case "current":
          colors = { fillColor: [255, 100, 0], strokeColor: [200, 80, 0] };
          break;
        case "upper":
          colors = { fillColor: [100, 150, 255], strokeColor: [50, 100, 200] };
          break;
        case "lower":
          colors = { fillColor: [255, 150, 100], strokeColor: [200, 100, 50] };
          break;
        case "left":
          colors = { fillColor: [255, 255, 100], strokeColor: [200, 200, 50] };
          break;
        case "right":
          colors = { fillColor: [255, 100, 255], strokeColor: [200, 50, 200] };
          break;
        default:
          colors = getPointColors("default");
      }

      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // Draw hull points with special highlight
  if (step.hull && step.hull.length > 0) {
    for (let i = 0; i < step.hull.length; i++) {
      const point = step.hull[i];
      const colors = { fillColor: [0, 200, 0], strokeColor: [0, 100, 0] };
      drawPointWithHover(
        point,
        pointSize + 4,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // Draw hull outline - only in the final step
  if (step.hull && step.hull.length > 2 && step.algorithmStep === 5) {
    stroke(0, 0, 255);
    strokeWeight(3);
    noFill();
    beginShape();
    for (const point of step.hull) {
      vertex(point.x, point.y);
    }
    endShape(CLOSE);
  }

  // Draw current dividing line
  if (step.currentLine) {
    stroke(255, 0, 0);
    strokeWeight(2);
    line(
      step.currentLine[0].x,
      step.currentLine[0].y,
      step.currentLine[1].x,
      step.currentLine[1].y
    );

    // Add line label
    const midX = (step.currentLine[0].x + step.currentLine[1].x) / 2;
    const midY = (step.currentLine[0].y + step.currentLine[1].y) / 2;
    fill(255, 0, 0);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text("DIVIDE", midX, midY - 15);
  }

  // Draw farthest point highlight
  if (step.farthestPoint) {
    // Draw pulsing rings around the farthest point (keeps visual emphasis)
    for (let ring = 0; ring < 3; ring++) {
      noFill();
      stroke(255, 255, 0, 150 - ring * 50);
      strokeWeight(3 - ring);
      const ringSize =
        pointSize + 8 + ring * 6 + sin(frameCount * 0.1 + ring) * 4;
      ellipse(step.farthestPoint.x, step.farthestPoint.y, ringSize);
    }

    // Draw the farthest point center using hover-aware helper
    const farColors = getPointColors("current");
    drawPointWithHover(
      step.farthestPoint,
      pointSize + 4,
      0,
      farColors.fillColor,
      farColors.strokeColor
    );

    // Add label
    fill(255, 255, 0);
    noStroke();
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text(
      "FARTHEST",
      step.farthestPoint.x,
      step.farthestPoint.y - pointSize / 2 - 8
    );
  }

  // Draw triangle lines, if available
  if (step.triangleLines) {
    stroke(100, 255, 100);
    strokeWeight(2);
    drawingContext.setLineDash([3, 3]);
    for (const linePoints of step.triangleLines) {
      line(linePoints[0].x, linePoints[0].y, linePoints[1].x, linePoints[1].y);
    }
    drawingContext.setLineDash([]);
  }

  // Draw upper/lower set indicators
  if (step.upperSet && step.upperSet.length > 0) {
    fill(100, 150, 255, 100);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Upper Set: ${step.upperSet.length} points`, 10, 10);
  }

  if (step.lowerSet && step.lowerSet.length > 0) {
    fill(255, 150, 100, 100);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Lower Set: ${step.lowerSet.length} points`, 10, 30);
  }

  // Draw step information
  if (step.description) {
    if (showCanvasText)
      drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Delaunay Triangulation (Bowyer-Watson) drawing function
 */
function drawDelaunay(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.delaunay;

  // Check if we should show duality
  const showDuality = step.showDuality || false;

  // Draw triangles with appropriate colors based on their status
  if (step.triangles && step.triangles.length > 0) {
    for (let i = 0; i < step.triangles.length; i++) {
      const triangle = step.triangles[i];
      let triangleStatus = "pending";

      // Check triangle status from event sets, if available
      if (step.eventSets && step.eventSets.triangles) {
        const triangleData = step.eventSets.triangles.find(
          (t) =>
            t.index === i ||
            (typeof t.index === "string" && t.index.includes(i))
        );
        if (triangleData) {
          triangleStatus = triangleData.status;
        }
      } else if (step.badTriangles && step.badTriangles.includes(i)) {
        triangleStatus = "rejected";
      }

      // Set color based on status
      switch (triangleStatus) {
        case "accepted":
          fill(150, 255, 150, 120);
          stroke(0, 150, 0);
          break;
        case "rejected":
          fill(255, 150, 150, 120);
          stroke(200, 0, 0);
          break;
        case "super":
          fill(180, 180, 255, 80);
          stroke(80, 80, 200);
          break;
        default:
          fill(150, 150, 255, 100);
          stroke(0, 0, 180);
      }

      strokeWeight(2);
      beginShape();
      for (const point of triangle) {
        vertex(point.x, point.y);
      }
      endShape(CLOSE);
    }
  }

  // Draw circumcircles (faded)
  if (step.circumcircles && step.circumcircles.length > 0) {
    for (let i = 0; i < step.circumcircles.length; i++) {
      const circle = step.circumcircles[i];
      if (!circle) continue;

      let circleStatus = "normal";

      // Check if this is a bad triangle's circumcircle
      if (step.badTriangles && step.badTriangles.includes(i)) {
        circleStatus = "bad";
      }

      // Set style based on status
      noFill();
      if (circleStatus === "bad") {
        stroke(255, 50, 50);
        strokeWeight(3);
        drawingContext.setLineDash([8, 4]); // Dashed line for bad circles
      } else {
        stroke(120, 120, 120);
        strokeWeight(1);
        drawingContext.setLineDash([]); // Solid line for normal circles
      }

      // Draw circumcircle ring (status-driven)
      ellipse(circle.center.x, circle.center.y, circle.radius * 2);
      drawingContext.setLineDash([]); // Reset to solid line

      // If showing duality, draw the Voronoi vertex at the circumcenter
      if (showDuality) {
        // Draw a small circumcenter marker using hover-aware helper
        const centerColors = {
          fillColor: [255, 0, 0],
          strokeColor: [200, 0, 0],
        };
        drawPointWithHover(
          circle.center,
          6,
          i,
          centerColors.fillColor,
          centerColors.strokeColor
        );
      }
    }
  }

  // Draw points
  if (algorithm.points && algorithm.points.length > 0) {
    for (let i = 0; i < algorithm.points.length; i++) {
      const point = algorithm.points[i];
      let pointStatus = "pending";

      // Check point status from event sets, if available
      if (step.eventSets && step.eventSets.points) {
        const pointData = step.eventSets.points.find((p) => p.index === i);
        if (pointData) {
          pointStatus = pointData.status;
        }
      } else if (step.highlightedPoints && step.highlightedPoints.includes(i)) {
        pointStatus = "current";
      }

      // Map statuses to colors, with theme-aware defaults
      let colors;
      switch (pointStatus) {
        case "processed":
          colors = { fillColor: [0, 180, 0], strokeColor: [0, 120, 0] };
          break;
        case "current":
          colors = { fillColor: [255, 150, 0], strokeColor: [200, 100, 0] };
          break;
        default:
          colors = getPointColors("default");
      }

      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // Draw new point being added with special highlight
  if (step.newPoint) {
    const newColors = { fillColor: [0, 255, 0], strokeColor: [0, 200, 0] };
    drawPointWithHover(
      step.newPoint,
      pointSize + 4,
      0,
      newColors.fillColor,
      newColors.strokeColor
    );

    // Add a pulsing ring effect (center handled by drawPointWithHover)
    noFill();
    stroke(0, 255, 0, 150);
    strokeWeight(1);
    ellipse(
      step.newPoint.x,
      step.newPoint.y,
      pointSize + 8 + sin(frameCount * 0.1) * 4
    );
  }

  // Draw Voronoi diagram if duality is enabled
  if (showDuality) {
    // Draw Voronoi edges between circumcenters
    if (step.circumcircles && step.circumcircles.length > 1) {
      stroke(255, 0, 0);
      strokeWeight(1);
      drawingContext.setLineDash([3, 3]);

      for (let i = 0; i < step.circumcircles.length; i++) {
        const circle1 = step.circumcircles[i];
        if (!circle1) continue;

        for (let j = i + 1; j < step.circumcircles.length; j++) {
          const circle2 = step.circumcircles[j];
          if (!circle2) continue;

          // Check if triangles share an edge
          const triangle1 = step.triangles[i];
          const triangle2 = step.triangles[j];

          let sharedVertices = 0;
          for (const v1 of triangle1) {
            for (const v2 of triangle2) {
              if (v1.equals(v2)) {
                sharedVertices++;
              }
            }
          }

          // If triangles share exactly 2 vertices, they share an edge
          if (sharedVertices === 2) {
            line(
              circle1.center.x,
              circle1.center.y,
              circle2.center.x,
              circle2.center.y
            );
          }
        }
      }

      drawingContext.setLineDash([]);
    }

    // Draw duality explanation (hideable via canvas text toggle)
    if (showCanvasText) {
      fill(0, 0, 0);
      noStroke();
      textSize(18);
      textAlign(LEFT, TOP);
      text(
        "Duality: Blue triangles = Delaunay, Red dashed lines = Voronoi",
        10,
        10
      );
      text("• Delaunay triangle vertices = Voronoi cell sites", 10, 30);
      text("• Voronoi vertices = Delaunay triangle circumcenters", 10, 50);
    }
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Voronoi diagram (via Delaunay) drawing function
 */
function drawVoronoi(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.voronoi;

  // 1. Show evolving Delaunay triangulation (background) when available
  if (
    !step.showDuality &&
    step.delaunayTriangulation &&
    step.delaunayTriangulation.length > 0
  ) {
    for (const triangle of step.delaunayTriangulation) {
      stroke(0, 80, 200, 180);
      strokeWeight(1.5);
      noFill();
      beginShape();
      for (const p of triangle) vertex(p.x, p.y);
      endShape(CLOSE);
    }
  }

  // 2. Progressive Voronoi edges (before full cells)
  if (step.voronoiEdges && step.voronoiEdges.length > 0) {
    stroke(60, 180, 60);
    strokeWeight(2);
    drawingContext.setLineDash([4, 4]);
    for (const e of step.voronoiEdges) {
      line(e.a.x, e.a.y, e.b.x, e.b.y);
    }
    drawingContext.setLineDash([]);

    // Highlight the newest edge
    if (step.newVoronoiEdge) {
      stroke(255, 200, 0);
      strokeWeight(3);
      drawingContext.setLineDash([2, 2]);
      line(
        step.newVoronoiEdge.a.x,
        step.newVoronoiEdge.a.y,
        step.newVoronoiEdge.b.x,
        step.newVoronoiEdge.b.y
      );
      drawingContext.setLineDash([]);
    }
  }

  // 3. Partial cells, while building
  if (step.partialCells && step.partialCells.length > 0) {
    for (let i = 0; i < step.partialCells.length; i++) {
      const cell = step.partialCells[i];
      const hue = (i * 137.5) % 360;
      colorMode(HSB, 360, 100, 100, 100);
      fill(hue, 50, 90, 35);
      stroke(hue, 70, 60);
      colorMode(RGB, 255, 255, 255, 255);
      strokeWeight(1.5);
      if (cell.vertices && cell.vertices.length > 1) {
        beginShape();
        for (const v of cell.vertices) vertex(v.x, v.y);
        endShape(CLOSE);
      }
      // site (theme-aware)
      const siteColors = getPointColors("default");
      drawPointWithHover(
        cell.site,
        pointSize - 2,
        i,
        siteColors.fillColor,
        siteColors.strokeColor
      );
    }
  }

  // 4. Final Voronoi cells
  if (step.voronoiCells && step.voronoiCells.length > 0) {
    for (let i = 0; i < step.voronoiCells.length; i++) {
      const cell = step.voronoiCells[i];

      // Use a different color for each cell
      const hue = (i * 137.5) % 360; // Golden angle to distribute colors
      colorMode(HSB, 360, 100, 100, 100);
      fill(hue, 50, 90, 70);
      stroke(hue, 70, 60);
      colorMode(RGB, 255, 255, 255, 255);

      strokeWeight(2);

      // Draw cell polygon
      if (cell.vertices.length > 2) {
        beginShape();
        for (const vertexPoint of cell.vertices) {
          vertex(vertexPoint.x, vertexPoint.y);
        }
        endShape(CLOSE);

        // Draw site point (theme-aware)
        const siteColors2 = getPointColors("default");
        drawPointWithHover(
          cell.site,
          pointSize,
          i,
          siteColors2.fillColor,
          siteColors2.strokeColor
        );

        // Draw site label (hideable via canvas text toggle)
        if (showCanvasText) {
          fill(0, 0, 0);
          noStroke();
          textSize(10);
          textAlign(CENTER, CENTER);
          text(`${i + 1}`, cell.site.x, cell.site.y);
        }
      }
    }
  }

  // 5. Draw Delaunay triangulation if duality is enabled (overrides background style)
  if (
    step.showDuality &&
    step.delaunayTriangulation &&
    step.delaunayTriangulation.length > 0
  ) {
    for (const triangle of step.delaunayTriangulation) {
      stroke(0, 0, 255);
      strokeWeight(1);
      noFill();
      beginShape();
      for (const point of triangle) {
        vertex(point.x, point.y);
      }
      endShape(CLOSE);
    }
  }

  // 6. Draw circumcenters, if available (always show to support incremental steps)
  if (step.circumcenters && step.circumcenters.length > 0) {
    for (let i = 0; i < step.circumcenters.length; i++) {
      const center = step.circumcenters[i];
      const cColors = { fillColor: [200, 0, 0], strokeColor: [150, 0, 0] };
      drawPointWithHover(center, 4, i, cColors.fillColor, cColors.strokeColor);
    }
  }

  // 7. Draw sites with statuses to show processing order
  if (algorithm.points && algorithm.points.length > 0) {
    const statusOf = (idx) => {
      if (step.eventSets && step.eventSets.points) {
        const pd = step.eventSets.points.find((p) => p.index === idx);
        return pd ? pd.status : "pending";
      }
      if (step.highlightedPoints && step.highlightedPoints.includes(idx))
        return "current";
      return "pending";
    };
    for (let i = 0; i < algorithm.points.length; i++) {
      const point = algorithm.points[i];
      const st = statusOf(i);
      let colors;
      switch (st) {
        case "processed":
          colors = { fillColor: [0, 180, 0], strokeColor: [0, 120, 0] };
          break;
        case "current":
          colors = { fillColor: [255, 150, 0], strokeColor: [200, 100, 0] };
          break;
        default:
          colors = getPointColors("default");
          break;
      }
      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // 8. Draw duality explanation (hideable via canvas text toggle)
  if (step.showDuality && showCanvasText) {
    fill(0, 0, 0);
    noStroke();
    textSize(18);
    textAlign(LEFT, TOP);
    text(
      "Duality: Blue lines = Delaunay triangulation, Colored regions = Voronoi cells",
      10,
      10
    );
    text("• Delaunay triangle vertices = Voronoi cell sites", 10, 30);
    text("• Voronoi vertices = Delaunay triangle circumcenters", 10, 50);
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Fortune's Voronoi algorithm drawing function
 */
function drawFortuneVoronoi(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.fortuneVoronoi;

  // Draw sites
  if (step.points && step.points.length > 0) {
    for (let i = 0; i < step.points.length; i++) {
      const point = step.points[i];
      const isProcessed =
        step.processedSites && step.processedSites.includes(point);

      const colors = isProcessed
        ? { fillColor: [0, 180, 0], strokeColor: [0, 120, 0] }
        : getPointColors("default");
      drawPointWithHover(
        point,
        pointSize,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // Draw sweep line, if available
  if (step.sweepY !== null && step.sweepY !== undefined) {
    stroke(255, 0, 0);
    strokeWeight(2);
    drawingContext.setLineDash([6, 4]);
    line(0, step.sweepY, width, step.sweepY);
    drawingContext.setLineDash([]);

    // Label (hideable via canvas text toggle)
    fill(255, 0, 0);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Sweep y = ${step.sweepY.toFixed(1)}`, 10, step.sweepY + 6);
  }

  // Beach line visualization: draw parabolic arcs for each processed site relative to sweepY
  if (
    step.sweepY !== null &&
    step.processedSites &&
    step.processedSites.length > 0
  ) {
    const y0 = step.sweepY; // directrix in canvas coords (y grows downward)
    // Sample x across screen; in canvas coordinates, the visible "lower envelope" is the maximum y
    const sampleCount = 240;
    const xs = [];
    for (let i = 0; i <= sampleCount; i++) xs.push((i / sampleCount) * width);

    const envelope = xs.map((x) => {
      let bestY = -Infinity,
        arg = null; // beachline is the upper envelope (max y) in canvas coords
      for (const s of step.processedSites) {
        const fy = s.y,
          fx = s.x;
        const denom = 2 * (fy - y0);
        if (Math.abs(denom) < 1e-4) continue; // near-vertical tangent; skip
        const yPar = ((x - fx) * (x - fx) + fy * fy - y0 * y0) / denom;
        if (yPar > bestY) {
          bestY = yPar;
          arg = s;
        }
      }
      if (!isFinite(bestY)) {
        bestY = y0;
      }
      return { x, y: bestY, site: arg };
    });

    // Heal invalid samples to keep a continuous curve
    for (let i = 0; i < envelope.length; i++) {
      if (!isFinite(envelope[i].y)) {
        const prevY = i > 0 ? envelope[i - 1].y : y0;
        envelope[i].y = isFinite(prevY) ? prevY : y0;
      }
    }

    // Draw one continuous polyline for the beachline
    stroke(0, 120, 255);
    strokeWeight(2.5);
    noFill();
    beginShape();
    for (const p of envelope) vertex(p.x, p.y);
    endShape();
  }

  // If final Voronoi cells computed, draw them softly in background
  if (step.voronoiCells && step.voronoiCells.length > 0) {
    for (let i = 0; i < step.voronoiCells.length; i++) {
      const cell = step.voronoiCells[i];
      const hue = (i * 137.5) % 360;
      colorMode(HSB, 360, 100, 100, 100);
      fill(hue, 40, 85, 35);
      stroke(hue, 70, 60, 70);
      colorMode(RGB, 255, 255, 255, 255);
      strokeWeight(1.5);

      if (cell.vertices && cell.vertices.length > 2) {
        beginShape();
        for (const v of cell.vertices) vertex(v.x, v.y);
        endShape(CLOSE);
      }
    }
  }

  // Step info text (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Polygon Triangulation drawing function
 */
function drawTriangulation(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.triangulation;

  // Draw the user-drawn polygon using edges (do not force closing when incomplete)
  if (algorithm.polygon && algorithm.polygon.vertices.length > 0) {
    // Draw edges (respects isComplete for closing edge automatically)
    stroke(0, 0, 0);
    strokeWeight(3);
    noFill();
    for (const edge of algorithm.polygon.edges) {
      line(edge.start.x, edge.start.y, edge.end.x, edge.end.y);
    }

    // If not complete, preview the next edge to the mouse from the last vertex
    if (
      !algorithm.polygon.isComplete &&
      algorithm.polygon.vertices.length > 0
    ) {
      const lastVertex =
        algorithm.polygon.vertices[algorithm.polygon.vertices.length - 1];
      const canvasX = (mouseX - canvasTransform.x) / canvasTransform.scale;
      const canvasY = (mouseY - canvasTransform.y) / canvasTransform.scale;
      stroke(150);
      strokeWeight(1);
      setLineDash([5, 5]);
      line(lastVertex.x, lastVertex.y, canvasX, canvasY);
      setLineDash([]);
    }

    // Draw vertices (theme-aware + hover)
    for (let i = 0; i < algorithm.polygon.vertices.length; i++) {
      const vtx = algorithm.polygon.vertices[i];
      const colors = getPointColors("default");
      drawPointWithHover(
        vtx,
        pointSize + 4,
        i,
        colors.fillColor,
        colors.strokeColor
      );
    }
  }

  // Draw triangles that have been created
  if (step.triangles && step.triangles.length > 0) {
    for (let i = 0; i < step.triangles.length; i++) {
      const triangle = step.triangles[i];

      // Use bright colors for triangles
      fill(50, 200, 50, 150); // Brighter green with more opacity
      stroke(0, 100, 0); // Darker green outline
      strokeWeight(3); // Thicker outline

      beginShape();
      for (const point of triangle) {
        vertex(point.x, point.y);
      }
      endShape(CLOSE);

      // Draw triangle centers with labels
      const centerX = (triangle[0].x + triangle[1].x + triangle[2].x) / 3;
      const centerY = (triangle[0].y + triangle[1].y + triangle[2].y) / 3;
      fill(0, 0, 0);
      noStroke();
      textSize(12);
      textAlign(CENTER, CENTER);
      text(`T${i + 1}`, centerX, centerY);
    }
  }

  // Draw current ear triangle with bright highlight
  if (step.currentEar && step.currentEar.length === 3) {
    fill(255, 255, 0, 200); // Bright yellow
    stroke(255, 100, 0); // Orange outline
    strokeWeight(4);
    beginShape();
    for (const point of step.currentEar) {
      vertex(point.x, point.y);
    }
    endShape(CLOSE);

    // Draw ear vertices with special highlight
    for (let i = 0; i < step.currentEar.length; i++) {
      const point = step.currentEar[i];
      const earColors = {
        fillColor: [255, 150, 0],
        strokeColor: [200, 100, 0],
      };
      drawPointWithHover(
        point,
        pointSize + 6,
        i,
        earColors.fillColor,
        earColors.strokeColor
      );
    }

    // Add "EAR" label
    const centerX =
      (step.currentEar[0].x + step.currentEar[1].x + step.currentEar[2].x) / 3;
    const centerY =
      (step.currentEar[0].y + step.currentEar[1].y + step.currentEar[2].y) / 3;
    fill(200, 100, 0);
    noStroke();
    textSize(18);
    textAlign(CENTER, CENTER);
    text("EAR", centerX, centerY);
  }

  // Draw current working polygon if it exists and is different from original
  if (
    step.polygon &&
    step.polygon.vertices &&
    step.polygon.vertices.length > 0
  ) {
    // Only draw working polygon outline if it's smaller than original
    if (step.polygon.vertices.length < algorithm.polygon.vertices.length) {
      stroke(100, 0, 100); // Purple outline
      strokeWeight(2);
      noFill();
      beginShape();
      for (const point of step.polygon.vertices) {
        vertex(point.x, point.y);
      }
      endShape(CLOSE);
    }

    // Draw working vertices with status colors
    for (let i = 0; i < step.polygon.vertices.length; i++) {
      const vertex = step.polygon.vertices[i];
      const isHighlighted =
        step.highlightedVertices && step.highlightedVertices.includes(i);
      const colors = isHighlighted
        ? { fillColor: [255, 50, 50], strokeColor: [120, 20, 20] }
        : getPointColors("default");
      drawPointWithHover(
        vertex,
        pointSize + 2,
        i,
        colors.fillColor,
        colors.strokeColor
      );

      // Add vertex number labels (contrast aware)
      fill(darkMode ? 255 : 0);
      noStroke();
      textSize(10);
      textAlign(CENTER, CENTER);
      text(`${i + 1}`, vertex.x, vertex.y);
    }
  }

  // Draw removed vertices, if available in event sets
  if (step.eventSets && step.eventSets.vertices) {
    const removedVertices = step.eventSets.vertices.filter(
      (v) => typeof v.index === "string" && v.index.startsWith("removed-")
    );

    if (removedVertices.length > 0) {
      for (const vertexData of removedVertices) {
        const vertex = vertexData.vertex;

        // Draw removed vertex with X mark (de-emphasized)
        const removedColors = {
          fillColor: [150, 150, 150],
          strokeColor: [80, 80, 80],
        };
        drawPointWithHover(
          vertex,
          pointSize,
          0,
          removedColors.fillColor,
          removedColors.strokeColor
        );

        // Draw X mark
        stroke(255, 0, 0);
        strokeWeight(2);
        const offset = pointSize / 2;
        line(
          vertex.x - offset,
          vertex.y - offset,
          vertex.x + offset,
          vertex.y + offset
        );
        line(
          vertex.x - offset,
          vertex.y + offset,
          vertex.x + offset,
          vertex.y - offset
        );
      }
    }
  }

  // Draw step information text
  if (step.description) {
    if (showCanvasText)
      drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }

  // If polygon invalid (self-intersections), highlight offending edges and points
  if (step && step.intersections && step.intersections.length > 0) {
    // Each intersection may include a.point indices (aIndex,bIndex) referencing edges
    for (const intr of step.intersections) {
      // Draw intersection point, if available
      if (intr.point) {
        stroke(255, 0, 0);
        fill(255, 100, 100);
        strokeWeight(2);
        drawPointWithHover(
          intr.point,
          pointSize + 6,
          0,
          [255, 120, 120],
          [200, 30, 30]
        );
      }

      // Highlight the two edges, if indices provided
      if (typeof intr.aIndex === "number" && typeof intr.bIndex === "number") {
        const eA = algorithm.polygon.edges[intr.aIndex];
        const eB = algorithm.polygon.edges[intr.bIndex];
        if (eA) {
          stroke(255, 0, 0);
          strokeWeight(6);
          line(eA.start.x, eA.start.y, eA.end.x, eA.end.y);
        }
        if (eB) {
          stroke(255, 0, 0);
          strokeWeight(6);
          line(eB.start.x, eB.start.y, eB.end.x, eB.end.y);
        }
      }
    }
  }
}

/**
 * Point-Line Duality - drawing function
 */
function drawDuality(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.duality;

  // Compute world<->math mapping relative to the viewport center in world coords
  const unit = 50; // World units per 1 math unit
  const xMinW = (0 - canvasTransform.x) / canvasTransform.scale;
  const xMaxW = (width - canvasTransform.x) / canvasTransform.scale;
  const yMinW = (0 - canvasTransform.y) / canvasTransform.scale;
  const yMaxW = (height - canvasTransform.y) / canvasTransform.scale;
  const cxW = (width / 2 - canvasTransform.x) / canvasTransform.scale;
  const cyW = (height / 2 - canvasTransform.y) / canvasTransform.scale;

  const worldToMath = (xw, yw) => ({
    x: (xw - cxW) / unit,
    y: (cyW - yw) / unit,
  });
  const mathToWorld = (xm, ym) => ({
    x: cxW + xm * unit,
    y: cyW - ym * unit,
  });
  // Visible bounds in math coords (derived from visible world window)
  const xMinM = (xMinW - cxW) / unit;
  const xMaxM = (xMaxW - cxW) / unit;
  const yMinM = (cyW - yMaxW) / unit; // DEBUG: y up
  const yMaxM = (cyW - yMinW) / unit;

  // Draw coordinate axes
  stroke(darkMode ? 200 : 100);
  strokeWeight(1);

  // X-axis in world coords (y = cyW)
  line(xMinW, cyW, xMaxW, cyW);
  // Y-axis in world coords (x = cxW)
  line(cxW, yMinW, cxW, yMaxW);

  // Draw axis labels near the visible edges (world coords)
  fill(darkMode ? 255 : 0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(12);
  text("x", xMaxW - 10, cyW - 15);
  text("y", cxW + 15, yMinW + 15);

  // Draw grid lines
  stroke(darkMode ? 100 : 200);
  strokeWeight(0.5);
  drawingContext.setLineDash([2, 2]);

  const gridSpacing = unit;
  // Vertical grid lines at x = cxW + k * unit
  const kxStart = Math.ceil((xMinW - cxW) / gridSpacing);
  const kxEnd = Math.floor((xMaxW - cxW) / gridSpacing);
  for (let k = kxStart; k <= kxEnd; k++) {
    const gx = cxW + k * gridSpacing;
    if (Math.abs(gx - cxW) > 1e-6) line(gx, yMinW, gx, yMaxW);
  }
  // Horizontal grid lines at y = cyW - k * unit
  const kyStart = Math.ceil((cyW - yMaxW) / gridSpacing);
  const kyEnd = Math.floor((cyW - yMinW) / gridSpacing);
  for (let k = kyStart; k <= kyEnd; k++) {
    const gy = cyW - k * gridSpacing;
    if (Math.abs(gy - cyW) > 1e-6) line(xMinW, gy, xMaxW, gy);
  }
  drawingContext.setLineDash([]);

  // Draw original points
  if (algorithm.showPoints && step.points) {
    for (let i = 0; i < step.points.length; i++) {
      const point = step.points[i];
      const isHovered =
        hoverState.hoveredPoint && hoverState.hoveredPoint.point === point;
      const isCurrent = step.currentPoint === point;

      // Use centralized color helper
      const colors = isCurrent
        ? getPointColors("current")
        : getPointColors("default");
      const strokeW = isCurrent ? 3 : 2;
      const fillColor = colors.fillColor;
      const strokeColor = colors.strokeColor;

      // Draw with hover handling via helper
      drawPointWithHover(point, pointSize, i, fillColor, strokeColor);

      // Draw point label
      fill(darkMode ? 255 : 0);
      noStroke();
      textAlign(CENTER, BOTTOM);
      textSize(10);
      text(`P${i + 1}`, point.x, point.y - pointSize / 2 - 5);

      drawingContext.shadowBlur = 0;
    }
  }

  // Draw original lines
  if (algorithm.showLines && step.lines) {
    for (let i = 0; i < step.lines.length; i++) {
      const lineObj = step.lines[i];
      const isHovered =
        hoverState.hoveredLine && hoverState.hoveredLine.line === lineObj;
      const isCurrent = step.currentLine === lineObj;

      if (isCurrent) {
        stroke(255, 255, 0);
        strokeWeight(3);
      } else {
        stroke(255, 100, 0);
        strokeWeight(2);
      }

      if (isHovered) {
        strokeWeight(4);
        drawingContext.shadowColor = "rgba(255, 255, 255, 0.8)";
        drawingContext.shadowBlur = 8;
      }

      // Draw line across the visible world window
      const y1 = lineObj.getY(xMinW);
      const y2 = lineObj.getY(xMaxW);
      line(xMinW, y1, xMaxW, y2);

      // Draw line label
      fill(darkMode ? 255 : 0);
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(10);
      const labelX = xMinW + 20;
      const labelY = lineObj.getY(labelX);
      if (labelY > yMinW && labelY < yMaxW) {
        text(`L${i + 1}`, labelX + 10, labelY);
      }

      drawingContext.shadowBlur = 0;
    }
  }

  // Draw dual lines (from points) using math mapping: Point (a,b) -> y = ax - b
  if (algorithm.showDualLines) {
    const srcPoints = algorithm.points || [];
    for (let i = 0; i < srcPoints.length; i++) {
      const p = srcPoints[i];
      const pm = worldToMath(p.x, p.y);
      const m = pm.x;
      const c = -pm.y;

      const isCurrent = step.currentPoint === p;
      if (isCurrent) {
        stroke(255, 255, 100);
        strokeWeight(3);
      } else {
        stroke(100, 255, 100);
        strokeWeight(2);
      }
      drawingContext.setLineDash([5, 5]);

      // Clip to visible x-range in math coordinates
      const yL = m * xMinM + c;
      const yR = m * xMaxM + c;
      const pL = mathToWorld(xMinM, yL);
      const pR = mathToWorld(xMaxM, yR);
      line(pL.x, pL.y, pR.x, pR.y);
      drawingContext.setLineDash([]);

      // Label near right edge, if visible
      const labelYM = m * (xMaxM - 0.2) + c;
      if (labelYM > yMinM && labelYM < yMaxM) {
        const labelP = mathToWorld(xMaxM - 0.2, labelYM);
        fill(100, 255, 100);
        noStroke();
        textAlign(RIGHT, CENTER);
        textSize(10);
        text(`D${i + 1}`, labelP.x, labelP.y);
      }
    }
  }

  // Draw dual points (from lines) using math mapping: Line y = mx + c -> (m, -c)
  if (algorithm.showDualPoints) {
    const srcLines = algorithm.lines || [];
    for (let i = 0; i < srcLines.length; i++) {
      const l = srcLines[i];
      // Convert world line to math line by sampling two visible world x's
      const s0 = { x: xMinW, y: l.getY(xMinW) };
      const s1 = { x: xMaxW, y: l.getY(xMaxW) };
      const m0 = worldToMath(s0.x, s0.y);
      const m1 = worldToMath(s1.x, s1.y);
      const dm = (m1.y - m0.y) / (m1.x - m0.x || 1e-6);
      const dc = m0.y - dm * m0.x;
      const dualPm = { x: dm, y: -dc };
      const dualPs = mathToWorld(dualPm.x, dualPm.y);

      const isCurrent = step.currentLine === l;
      // Dual points: use helper with 'dual' status
      const dualColors = isCurrent
        ? getPointColors("current")
        : getPointColors("dual");
      drawPointWithHover(
        dualPs,
        pointSize,
        i,
        dualColors.fillColor,
        dualColors.strokeColor
      );

      // Label
      fill(darkMode ? 255 : 0);
      noStroke();
      textAlign(CENTER, TOP);
      textSize(10);
      text(`DP${i + 1}`, dualPs.x, dualPs.y + pointSize / 2 + 5);
    }
  }

  // Draw line being dragged
  if (
    isDragging &&
    dragStart &&
    algorithmManager.currentAlgorithm === "duality"
  ) {
    const curX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const curY = (mouseY - canvasTransform.y) / canvasTransform.scale;
    stroke(255, 165, 0);
    strokeWeight(2);
    drawingContext.setLineDash([5, 5]);
    line(dragStart.x, dragStart.y, curX, curY);
    drawingContext.setLineDash([]);
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 18, [LEFT, TOP]);
  }
}

/**
 * Interval Tree - drawing function
 */
function drawIntervalTree(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.intervalTree;

  // Calculate layout parameters
  const numberLineY = height * 0.8; // Moves number line lower to make more room for the tree
  const numberLineStart = 50;
  const numberLineEnd = width - 50;
  const numberLineRange = 100; // 0 to 100
  const intervalSpacing = 14;
  const intervalYOffset = 24; // space above number line to start stacking

  // Draw main number line
  stroke(darkMode ? 255 : 0);
  strokeWeight(2);
  line(numberLineStart, numberLineY, numberLineEnd, numberLineY);

  // Draw tick marks and labels
  fill(darkMode ? 255 : 0);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(12);

  for (let i = 0; i <= 10; i++) {
    const value = i * 10;
    const x =
      numberLineStart +
      (value / numberLineRange) * (numberLineEnd - numberLineStart);

    // Draw tick mark
    stroke(darkMode ? 200 : 80);
    strokeWeight(1);
    line(x, numberLineY - 5, x, numberLineY + 5);

    // Draw label
    noStroke();
    textSize(11);
    text(value.toString(), x, numberLineY + 8);
  }

  // Draw intervals stacked vertically to avoid overlap (visual clutter)
  // TODO: Visual clutter is still an issue, if there are too many slabs
  if (algorithm.intervals && algorithm.intervals.length > 0) {
    for (let i = 0; i < algorithm.intervals.length; i++) {
      const interval = algorithm.intervals[i];
      const startX =
        numberLineStart +
        (interval.start / numberLineRange) * (numberLineEnd - numberLineStart);
      const endX =
        numberLineStart +
        (interval.end / numberLineRange) * (numberLineEnd - numberLineStart);

      // Calculate Y position for this interval (stack them vertically)
      const intervalY = numberLineY - intervalYOffset - i * intervalSpacing;

      // Check if this interval is highlighted in the current step
      let intervalStatus = "normal";
      if (
        step.highlightedIntervals &&
        step.highlightedIntervals.includes(interval)
      ) {
        intervalStatus = "highlighted";
      } else if (
        step.centerIntervals &&
        step.centerIntervals.includes(interval)
      ) {
        intervalStatus = "center";
      } else if (step.leftIntervals && step.leftIntervals.includes(interval)) {
        intervalStatus = "left";
      } else if (
        step.rightIntervals &&
        step.rightIntervals.includes(interval)
      ) {
        intervalStatus = "right";
      }

      // Check if this interval is being hovered
      const isHovered =
        hoverState.hoveredInterval &&
        hoverState.hoveredInterval.interval === interval;

      // Set color based on status
      switch (intervalStatus) {
        case "highlighted":
          fill(255, 255, 0, 180);
          stroke(255, 200, 0);
          break;
        case "center":
          fill(255, 100, 100, 180);
          stroke(255, 0, 0);
          break;
        case "left":
          fill(100, 100, 255, 180);
          stroke(0, 0, 255);
          break;
        case "right":
          fill(100, 255, 100, 180);
          stroke(0, 255, 0);
          break;
        default:
          fill(150, 150, 150, 180);
          stroke(100, 100, 100);
      }

      // Add hover highlighting
      if (isHovered) {
        strokeWeight(4);
        drawingContext.shadowColor = "rgba(255, 255, 255, 0.8)";
        drawingContext.shadowBlur = 8;
      } else {
        strokeWeight(3);
        drawingContext.shadowBlur = 0;
      }

      // Draw interval as a rounded rectangle
      const rectHeight = 8;
      rect(
        startX,
        intervalY - rectHeight / 2,
        Math.max(2, endX - startX),
        rectHeight,
        4
      );

      // Draw interval endpoints as circles (theme-aware)
      const endpointColors = getPointColors("default");
      drawPointWithHover(
        { x: startX, y: intervalY },
        6,
        i * 2,
        endpointColors.fillColor,
        endpointColors.strokeColor
      );
      drawPointWithHover(
        { x: endX, y: intervalY },
        6,
        i * 2 + 1,
        endpointColors.fillColor,
        endpointColors.strokeColor
      );

      // Draw interval label
      noStroke();
      fill(darkMode ? 255 : 0);
      textAlign(LEFT, CENTER);
      textSize(9);
      text(`I${i + 1}`, startX - 22, intervalY);

      // Draw interval values
      textAlign(CENTER, CENTER);
      textSize(9);
      fill(darkMode ? 230 : 30);
      text(
        `${interval.start.toFixed(1)}–${interval.end.toFixed(1)}`,
        (startX + endX) / 2,
        intervalY
      );

      // Reset shadow
      drawingContext.shadowBlur = 0;
    }
  }

  // Draw median line, if available
  if (step.median !== undefined) {
    const medianX =
      numberLineStart +
      (step.median / numberLineRange) * (numberLineEnd - numberLineStart);
    stroke(255, 80, 80);
    strokeWeight(2);
    drawingContext.setLineDash([4, 4]);
    const intervalsHeight = algorithm.intervals.length * intervalSpacing;
    line(
      medianX,
      Math.max(60, numberLineY - intervalsHeight - 80),
      medianX,
      numberLineY + 22
    );
    drawingContext.setLineDash([]);

    // Draw median label
    fill(255, 80, 80);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(11);
    text(
      `Median ${step.median.toFixed(1)}`,
      medianX,
      Math.max(
        55,
        numberLineY - algorithm.intervals.length * intervalSpacing - 85
      )
    );
  }

  // Draw interval tree structure above the intervals
  if (step.tree) {
    const intervalsHeight = algorithm.intervals.length * intervalSpacing;
    const treeTopY = 60; // top margin
    const treeBottomY = Math.max(
      treeTopY + 100,
      numberLineY - intervalsHeight - 90
    );
    const maxTreeHeight = treeBottomY - treeTopY;

    const getTreeDepth = (node) =>
      node
        ? 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right))
        : 0;
    const totalDepth = Math.max(1, getTreeDepth(step.tree));
    const verticalGap = Math.max(70, maxTreeHeight / totalDepth);

    drawTreeNode(
      step.tree,
      width / 2,
      treeTopY,
      width / 4,
      step,
      numberLineStart,
      numberLineEnd,
      numberLineRange,
      0,
      verticalGap,
      4
    );
  }

  // Draw line being dragged for interval creation
  if (
    isDragging &&
    dragStart &&
    algorithmManager.currentAlgorithm === "intervalTree"
  ) {
    const currentX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const previewY =
      numberLineY -
      intervalYOffset -
      algorithm.intervals.length * intervalSpacing;
    stroke(255, 165, 0);
    strokeWeight(2);
    drawingContext.setLineDash([4, 4]);

    // Draw preview rectangle
    fill(255, 165, 0, 90);
    const rectHeight = 8;
    rect(
      Math.min(dragStart.x, currentX),
      previewY - rectHeight / 2,
      Math.abs(currentX - dragStart.x),
      rectHeight,
      4
    );

    drawingContext.setLineDash([]);
  }

  // Draw step information (hideable via canvas text toggle)
  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 13, [LEFT, TOP]);
  }
}

/**
 * SegmentTree
 */
function drawSegmentTree(step, pointSize) {
  if (!step) return;

  const algorithm = algorithmManager.algorithms.segmentTree;

  // Layout constants
  const numberLineY = height * 0.8;
  const numberLineStart = 50;
  const numberLineEnd = width - 50;
  const numberLineRange = 100;
  const intervalSpacing = 14;
  const intervalYOffset = 24;

  // Number line
  stroke(darkMode ? 255 : 0);
  strokeWeight(2);
  line(numberLineStart, numberLineY, numberLineEnd, numberLineY);
  // Ticks
  fill(darkMode ? 255 : 0);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(11);
  for (let i = 0; i <= 10; i++) {
    const value = i * 10;
    const x =
      numberLineStart +
      (value / numberLineRange) * (numberLineEnd - numberLineStart);
    stroke(darkMode ? 200 : 80);
    strokeWeight(1);
    line(x, numberLineY - 5, x, numberLineY + 5);
    noStroke();
    text(value.toString(), x, numberLineY + 8);
  }

  // Intervals stacked
  if (algorithm.intervals && algorithm.intervals.length > 0) {
    for (let i = 0; i < algorithm.intervals.length; i++) {
      const iv = algorithm.intervals[i];
      const sx =
        numberLineStart +
        (iv.start / numberLineRange) * (numberLineEnd - numberLineStart);
      const ex =
        numberLineStart +
        (iv.end / numberLineRange) * (numberLineEnd - numberLineStart);
      const iy = numberLineY - intervalYOffset - i * intervalSpacing;
      const isHovered =
        hoverState.hoveredInterval &&
        hoverState.hoveredInterval.interval === iv;
      fill(120, 180, 255, 180);
      stroke(50, 120, 220);
      strokeWeight(isHovered ? 4 : 3);
      if (isHovered) {
        drawingContext.shadowColor = "rgba(255,255,255,0.8)";
        drawingContext.shadowBlur = 8;
      }
      const rectH = 8;
      rect(sx, iy - rectH / 2, Math.max(2, ex - sx), rectH, 4);
      const epColors = getPointColors("default");
      drawPointWithHover(
        { x: sx, y: iy },
        6,
        i * 2,
        epColors.fillColor,
        epColors.strokeColor
      );
      drawPointWithHover(
        { x: ex, y: iy },
        6,
        i * 2 + 1,
        epColors.fillColor,
        epColors.strokeColor
      );
      drawingContext.shadowBlur = 0;
      noStroke();
      fill(darkMode ? 255 : 0);
      textAlign(LEFT, CENTER);
      textSize(9);
      text(`I${i + 1}`, sx - 22, iy);
      textAlign(CENTER, CENTER);
      text(`${iv.start.toFixed(1)}–${iv.end.toFixed(1)}`, (sx + ex) / 2, iy);
    }
  }

  // Draw slabs, if available
  if (step.slabs && step.endpoints && step.endpoints.length) {
    stroke(150, 150, 150, 120);
    strokeWeight(1);
    drawingContext.setLineDash([3, 3]);
    for (const ep of step.endpoints) {
      const x =
        numberLineStart +
        (ep / numberLineRange) * (numberLineEnd - numberLineStart);
      line(x, numberLineY - 40, x, numberLineY + 20);
    }
    drawingContext.setLineDash([]);
  }

  // Draw segment tree structure using node l..r mapped to slab centers
  if (step.tree && step.slabs) {
    const getDepth = (n) =>
      n ? 1 + Math.max(getDepth(n.left), getDepth(n.right)) : 0;
    const topY = 60;
    const bottomY = Math.max(
      topY + 100,
      numberLineY - algorithm.intervals.length * intervalSpacing - 90
    );
    const verticalGap = Math.max(
      70,
      (bottomY - topY) / Math.max(1, getDepth(step.tree))
    );

    const slabCenterX = (idx) => {
      const s = step.slabs[idx];
      const cxVal = (s.start + s.end) / 2;
      return (
        numberLineStart +
        (cxVal / numberLineRange) * (numberLineEnd - numberLineStart)
      );
    };

    const drawNode = (node, y) => {
      if (!node) return;
      // Map node x to average of its covered slab centers
      const x = (slabCenterX(node.l) + slabCenterX(node.r)) / 2;
      // Node body
      fill(220, 245, 220, 200);
      stroke(60, 150, 60);
      strokeWeight(2);
      const radius = 28;
      ellipse(x, y, radius);
      // Label
      if (showCanvasText) {
        noStroke();
        fill(darkMode ? 255 : 0);
        textAlign(CENTER, CENTER);
        textSize(10);
        text(`[${node.l},${node.r}]`, x, y - 6);
        text(`${node.items.length} iv`, x, y + 7);
      }
      // Mini bars
      const shown = Math.min(node.items.length, 3);
      for (let i = 0; i < shown; i++) {
        const it = node.items[i];
        const miniW =
          50 * Math.max(0.06, (it.end - it.start) / numberLineRange);
        fill(120, 220, 120, 160);
        stroke(60, 150, 60);
        strokeWeight(1.2);
        rect(x - miniW / 2, y + radius / 2 + 4 + i * 7 - 3, miniW, 6, 3);
      }
      if (node.items.length > shown) {
        noStroke();
        fill(darkMode ? 255 : 0);
        textSize(9);
        text(
          `+${node.items.length - shown} more`,
          x,
          y + radius / 2 + 4 + shown * 7
        );
      }
      // Children
      const childY = y + verticalGap;
      if (node.left) {
        stroke(120);
        strokeWeight(1.5);
        const lx = (slabCenterX(node.left.l) + slabCenterX(node.left.r)) / 2;
        line(x, y + radius / 2, lx, childY - 14);
        drawNode(node.left, childY);
      }
      if (node.right) {
        stroke(120);
        strokeWeight(1.5);
        const rx = (slabCenterX(node.right.l) + slabCenterX(node.right.r)) / 2;
        line(x, y + radius / 2, rx, childY - 14);
        drawNode(node.right, childY);
      }
    };

    drawNode(step.tree, topY);
  }

  // Drag preview
  if (
    isDragging &&
    dragStart &&
    algorithmManager.currentAlgorithm === "segmentTree"
  ) {
    const currentX = (mouseX - canvasTransform.x) / canvasTransform.scale;
    const previewY =
      numberLineY -
      intervalYOffset -
      algorithm.intervals.length * intervalSpacing;
    stroke(255, 165, 0);
    strokeWeight(2);
    drawingContext.setLineDash([4, 4]);
    fill(255, 165, 0, 90);
    const rectH = 8;
    rect(
      Math.min(dragStart.x, currentX),
      previewY - rectH / 2,
      Math.abs(currentX - dragStart.x),
      rectH,
      4
    );
    drawingContext.setLineDash([]);
  }

  if (showCanvasText && step.description) {
    drawText(step.description, 10, height - 30, 13, [LEFT, TOP]);
  }
}
