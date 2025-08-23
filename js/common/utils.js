/**
 * Shared utilities for CGViz
 * - Attaches helpers to window.Utils
 **/

(function () {
  function makeSeededRng(seed) {
    // Simple string -> 32-bit hash
    const hashStr = (s) => {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h >>> 0;
    };

    let s;
    if (typeof seed === "number" && isFinite(seed)) {
      s = Math.floor(seed) >>> 0;
    } else {
      s = hashStr(String(seed || ""));
    }

    // Mulberry32-like generator
    // See: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
    let a = s >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // To draw credit text on the canvas context
  function drawCreditOnContext(ctx, w, h, options = {}) {
    const text = options.text || "Created using https://jes24.github.io/CGViz/";
    const padding = options.padding || 8;
    const fontSize = options.fontSize || 18;
    const fontFamily = options.fontFamily || "Arial";

    const linkColor = options.fill || "#1a73e8";
    const underlineColor = options.underlineColor || linkColor;
    const dotSize = options.dotSize || 1.5;
    const dotSpacing = options.dotSpacing || 4;

    try {
      ctx.save();
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = linkColor;
      ctx.textBaseline = "bottom";
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width || text.length * (fontSize * 0.6);
      const x = w - padding - textWidth;
      const y = h - padding;
      ctx.fillText(text, x, y);

      ctx.fillStyle = underlineColor;
      const underlineY = y + 3;
      for (let px = x; px < x + textWidth; px += dotSpacing) {
        ctx.fillRect(px, underlineY, dotSize, 1);
      }
    } catch (e) {
      // pass - non-fatal
    } finally {
      try {
        ctx.restore();
      } catch (e) {}
    }
  }

  // Notification helper
  function showNotification(message, type = "success") {
    try {
      const notification = document.createElement("div");
      notification.textContent = message;
      notification.style.position = "fixed";
      notification.style.top = "40px";
      notification.style.left = "50%";
      notification.style.transform = "translateX(-50%)";
      notification.style.backgroundColor =
        type === "success"
          ? "rgba(39, 174, 96, 0.9)"
          : "rgba(231, 76, 60, 0.9)";
      notification.style.color = "white";
      notification.style.padding = "10px 20px";
      notification.style.borderRadius = "5px";
      notification.style.zIndex = "1000";
      notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";

      document.body.appendChild(notification);
      setTimeout(() => {
        try {
          document.body.removeChild(notification);
        } catch (e) {}
      }, 3000);
    } catch (e) {
      // DEBUG: Log to console
      try {
        console.log(message);
      } catch (e) {}
    }
  }

  // Formatters for viz on canvas
  function formatPoint(p) {
    return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
  }

  function formatSigned(v) {
    return v >= 0 ? `+${v.toFixed(2)}` : `-${Math.abs(v).toFixed(2)}`;
  }

  function formatDualLineEquation(m, c) {
    return `y = ${m.toFixed(2)}x ${formatSigned(c)}`;
  }

  // Distance helpers
  function distanceToLineSegment(px, py, segment) {
    const x1 = segment.p1.x;
    const y1 = segment.p1.y;
    const x2 = segment.p2.x;
    const y2 = segment.p2.y;

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.hypot(px - x1, py - y1);

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return Math.hypot(px - xx, py - yy);
  }

  function distanceToLine(px, py, lineObj) {
    const m = lineObj.slope;
    const c = lineObj.intercept;
    return Math.abs(m * px - py + c) / Math.sqrt(m * m + 1);
  }

  // Creates a cloned offscreen canvas with optional background fill
  function cloneCanvas(srcCanvas, options = {}) {
    try {
      const off = document.createElement("canvas");
      off.width = srcCanvas.width;
      off.height = srcCanvas.height;
      const ctx = off.getContext("2d");
      const bg = options.backgroundColor;
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, off.width, off.height);
      }
      // srcCanvas may be a p5 canvas wrapper or a DOM canvas
      const src =
        srcCanvas && srcCanvas.getContext
          ? srcCanvas
          : srcCanvas?.canvas || srcCanvas;
      ctx.drawImage(src, 0, 0);
      return off;
    } catch (e) {
      return null;
    }
  }

  // Download helpers
  function downloadBlob(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      try {
        console.error("downloadBlob failed:", e);
      } catch (ignored) {}
      return false;
    }
  }

  function downloadDataUrl(dataUrl, filename) {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) {
      try {
        console.error("downloadDataUrl failed:", e);
      } catch (ignored) {}
      return false;
    }
  }

  // Measures text width using a cached canvas 2D context. Returns width in px.
  const _measCtx = (function () {
    try {
      const c = document.createElement("canvas");
      return c.getContext("2d");
    } catch (e) {
      return null;
    }
  })();

  function measureText(text, font) {
    try {
      if (!_measCtx) return text.length * 8; // fallback
      if (font) _measCtx.font = font;
      const m = _measCtx.measureText(text);
      return m && m.width ? m.width : text.length * 8;
    } catch (e) {
      return text.length * 8;
    }
  }

  // Attach to window
  if (!window.Utils) window.Utils = {};
  window.Utils.makeSeededRng = makeSeededRng;
  window.Utils.drawCreditOnContext = drawCreditOnContext;
  window.Utils.showNotification = showNotification;
  window.Utils.formatPoint = formatPoint;
  window.Utils.formatSigned = formatSigned;
  window.Utils.formatDualLineEquation = formatDualLineEquation;
  window.Utils.distanceToLineSegment = distanceToLineSegment;
  window.Utils.distanceToLine = distanceToLine;
  window.Utils.cloneCanvas = cloneCanvas;
  window.Utils.downloadBlob = downloadBlob;
  window.Utils.downloadDataUrl = downloadDataUrl;
  window.Utils.measureText = measureText;
})();
