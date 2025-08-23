/**
 * Export utilities for CGViz
 * - Provides functions to export canvas as PNG, JPG, SVG, PDF, and GIF.
 * - Handles drawing credit text on exported images.
 * - Uses ./common/utils.js (Utils) for shared functionality like downloading blobs and drawing credit.
 *
 * Known Issues: FIXME:
 * - [ ] Remove fallbacks if the functions are robust enough now
 * - [ ] Make GIF recording more configurable (duration, interval)
 * - [ ] Check TODO:s below.
 */

// Global variables for GIF recording
window.isRecordingGif = false;
window.gifEncoder = null;
window.recordingStartTime = 0;
window.recordingDuration = 5000; // 5 seconds by default | TODO: Is this too short? Should we allow configurability?
window.recordingInterval = 100; // Capture frame every 100ms | TODO: Is this too slow? Should we allow configurability?

// Shorthand helper: delegates to shared Utils
function drawCreditOnContext(ctx, w, h, options = {}) {
  return window.Utils.drawCreditOnContext(ctx, w, h, options);
}

// Helper: export raster image (png/jpg) by cloning canvas, drawing credit, and saving
window.exportImageAsRaster = function (format, filenameBase) {
  try {
    const fmt = format === "jpg" ? "image/jpeg" : "image/png";
    // Try using Utils.cloneCanvas to centralize offscreen creation
    let off = null;
    try {
      if (window.Utils && typeof window.Utils.cloneCanvas === "function") {
        off = window.Utils.cloneCanvas(canvas, {
          backgroundColor: window.darkMode ? "#1e1e1e" : "#ffffff",
        });
      }
    } catch (e) {
      off = null;
    }

    if (!off) {
      // Fallback to manual creation
      off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const ctx = off.getContext("2d");
      ctx.fillStyle = window.darkMode ? "#1e1e1e" : "#ffffff";
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(canvas.canvas, 0, 0);
      drawCreditOnContext(ctx, off.width, off.height, {
        text: "Created using https://jes24.github.io/CGViz/",
        fontSize: 18,
      });
    }

    // Create blob and download (use Utils.downloadBlob if available)
    try {
      off.toBlob(
        (blob) => {
          if (!blob) {
            window.Utils.showNotification("Export failed.", "error");
            return;
          }
          const filename = `${filenameBase}.${format}`;
          if (window.Utils && typeof window.Utils.downloadBlob === "function") {
            if (!window.Utils.downloadBlob(blob, filename)) {
              // Fallback to anchor
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          window.Utils.showNotification(
            `${format.toUpperCase()} exported successfully!`
          );
        },
        fmt,
        0.95
      );
    } catch (err) {
      console.error("Error exporting image (blob):", err);
      window.Utils.showNotification("Export failed.", "error");
    }
  } catch (err) {
    console.error("Error exporting image:", err);
    window.Utils.showNotification(
      "Error exporting image. Check console.",
      "error"
    );
  }
};

// Exports canvas in various formats
let __exportBusy = false;
window.exportCanvas = function () {
  if (__exportBusy) return; // To prevent double-trigger
  __exportBusy = true;
  setTimeout(() => {
    __exportBusy = false;
  }, 300); // Brief guard window

  const format = document.getElementById("export-format").value;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `CGViz-${algorithmManager.currentAlgorithm}-${timestamp}`;

  switch (format) {
    case "png":
      window.exportImageAsRaster("png", filename);
      break;
    case "jpg":
      window.exportImageAsRaster("jpg", filename);
      break;
    case "svg":
      window.exportSVG(filename);
      break;
    case "pdf":
      window.exportPDF(filename);
      break;
    case "gif":
      // Offers step-based export, when steps are available
      const alg = window.algorithmManager.getCurrentAlgorithm();
      const hasSteps = alg && Array.isArray(alg.steps) && alg.steps.length > 0;
      if (hasSteps) {
        const doSteps = window.confirm(
          "Export GIF of algorithm steps?\nOK = Playback Steps GIF, Cancel = Live recording"
        );
        if (doSteps) {
          window.exportStepsAsGif(filename).catch((err) => {
            console.error("Step GIF export failed:", err);
            window.Utils.showNotification(
              "Step GIF export failed. Check console for details.",
              "error"
            );
          });
          break;
        }
      }
      if (!window.isRecordingGif) {
        window.startGifRecording();
      } else {
        window.stopGifRecording(filename);
      }
      break;
  }
};

// Export canvas as PDF using jsPDF
window.exportPDF = function (filename) {
  try {
    // Create a new jsPDF instance
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    // Get canvas data as base64 image
    const imgData = canvas.elt.toDataURL("image/png");

    // Add the image to the PDF
    doc.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

    // Credit bottom-right
    const creditText = "Created using https://jes24.github.io/CGViz/";
    const padding = 8;
    const fontSize = 24;
    doc.setFontSize(fontSize);
    // Set link color (blue) for the credit text
    const linkColorRGB = [26, 115, 232]; // #1a73e8
    doc.setTextColor(...linkColorRGB);
    // Measure text width (jsPDF uses getTextWidth)
    const textWidth = doc.getTextWidth
      ? doc.getTextWidth(creditText)
      : (creditText.length * fontSize) / 2; // Fallback estimate
    const x = canvas.width - textWidth - padding;
    const y = canvas.height - padding;
    // Render text + link using textWithLink
    let textDrawnByLinkApi = false;
    try {
      if (typeof doc.textWithLink === "function") {
        doc.textWithLink(creditText, x, y, {
          url: "https://jes24.github.io/CGViz/",
        });
        textDrawnByLinkApi = true;
      }
    } catch (e) {
      console.warn(
        "textWithLink failed, will fallback to drawing text and link rect:",
        e
      );
      textDrawnByLinkApi = false;
    }

    // If textWithLink wasn't available or failed, draw the text normally
    if (!textDrawnByLinkApi) {
      doc.text(creditText, x, y);
    }

    // Draw a dotted underline under the text to indicate a clickable link.
    try {
      // Try using line dash if supported
      if (typeof doc.setLineDash === "function") {
        doc.setDrawColor(...linkColorRGB);
        doc.setLineWidth(0.5);
        doc.setLineDash([1, 2], 0);
        const underlineY = y + 2; // slight offset below baseline
        doc.line(x, underlineY, x + textWidth, underlineY);
        // reset dash
        doc.setLineDash([], 0);
      } else if (typeof doc.rect === "function") {
        // Fallback: draw small filled rectangles (dots) across the underline area
        const dotW = 1.5;
        const dotSpacing = 4;
        const underlineY = y + 2;
        doc.setFillColor(...linkColorRGB);
        for (let px = x; px < x + textWidth; px += dotSpacing) {
          // rect(x, y, w, h, style)
          doc.rect(px, underlineY, dotW, 0.8, "F");
        }
      }
    } catch (e) {
      console.warn("Could not draw dotted underline in PDF export:", e);
    }

    // If textWithLink wasn't used, add a link rectangle over the text area as fallback.
    if (!textDrawnByLinkApi) {
      try {
        if (typeof doc.link === "function") {
          // jsPDF coordinates: x, y measured from left/top in current units (px here)
          // link's y parameter is top coordinate; doc.text uses baseline, so, adjust by font size.
          const linkX = x;
          const linkY = y - fontSize; // top of the text box
          const linkW = textWidth;
          const linkH = fontSize + 2;
          doc.link(linkX, linkY, linkW, linkH, {
            url: "https://jes24.github.io/CGViz/",
          });
        }
      } catch (e) {
        console.warn(
          "Could not add clickable link rectangle to PDF export:",
          e
        );
      }
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);

    // Show success/error notification
    window.Utils.showNotification("PDF exported successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    window.Utils.showNotification(
      "Error generating PDF. Check console for details.",
      "error"
    );
  }
};

// Export canvas as SVG
window.exportSVG = function (filename) {
  try {
    // DEBUG: This is an extended fix
    // We'll embed a rasterized snapshot of the canvas into a simple SVG
    // so the exported SVG matches what the user sees (including p5 drawing
    // that may not be represented by the step data). This avoids missing
    // primitives in many algorithms.
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", canvas.width);
    svg.setAttribute("height", canvas.height);
    svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);

    // Create an image element using the current canvas PNG data
    const img = document.createElementNS(svgNamespace, "image");
    const dataUrl = canvas.elt.toDataURL("image/png");
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
    img.setAttribute("x", "0");
    img.setAttribute("y", "0");
    img.setAttribute("width", canvas.width);
    img.setAttribute("height", canvas.height);
    svg.appendChild(img);

    // Add credit text in bottom-right
    const creditText = "Created using https://jes24.github.io/CGViz/";
    // Create a clickable credit by wrapping the text in an <a> element with xlink:href (SVG/PDF only)
    const fontSize = 18;
    const padding = 8;

    // Create <a> element using xlink namespace for broader compatibility
    const XLINK_NS = "http://www.w3.org/1999/xlink";
    const aLink = document.createElementNS(svgNamespace, "a");
    aLink.setAttributeNS(
      XLINK_NS,
      "xlink:href",
      "https://jes24.github.io/CGViz/"
    );
    aLink.setAttribute("target", "_blank");

    const text = document.createElementNS(svgNamespace, "text");
    text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    text.setAttribute("font-size", fontSize);
    const linkColor = darkMode ? "#8ab4ff" : "#1a73e8";
    text.setAttribute("fill", linkColor);
    const textX = canvas.width - padding;
    const textY = canvas.height - padding;
    text.setAttribute("x", textX);
    text.setAttribute("y", textY);
    text.setAttribute("text-anchor", "end");
    text.textContent = creditText;

    // Add dotted underline using stroke-dasharray on a line element positioned under the text
    const underline = document.createElementNS(svgNamespace, "line");
    // approximate text width using canvas measureText fallback
    let approxTextWidth = fontSize * (creditText.length * 0.5);
    try {
      // Temporary canvas to measure more accurately
      const meas = document.createElement("canvas").getContext("2d");
      meas.font = `${fontSize}px Arial`;
      const m = meas.measureText(creditText);
      if (m && m.width) approxTextWidth = m.width;
    } catch (e) {}

    const underlinePadding = 2;
    underline.setAttribute("x1", textX - approxTextWidth);
    underline.setAttribute("x2", textX);
    underline.setAttribute("y1", textY + underlinePadding);
    underline.setAttribute("y2", textY + underlinePadding);
    underline.setAttribute("stroke", linkColor);
    underline.setAttribute("stroke-width", 1);
    underline.setAttribute("stroke-dasharray", "1,3");

    aLink.appendChild(text);
    aLink.appendChild(underline);
    svg.appendChild(aLink);

    // Serialize and trigger download
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    // Try Utils.downloadBlob
    const name = `${filename}.svg`;
    if (window.Utils && typeof window.Utils.downloadBlob === "function") {
      if (!window.Utils.downloadBlob(blob, name)) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } else {
      // fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // Show success/error notification
    window.Utils.showNotification("SVG exported successfully!");
  } catch (error) {
    console.error("Error generating SVG:", error);
    window.Utils.showNotification(
      "Error generating SVG. Check console for details.",
      "error"
    );
  }
};

// Start recording GIF
window.startGifRecording = function () {
  if (window.isRecordingGif) return;

  try {
    // Initialize GIF encoder
    window.gifEncoder = new GIFEncoder();
    window.gifEncoder.setRepeat(0); // 0 = repeat forever
    window.gifEncoder.setDelay(window.recordingInterval); // ms per frame
    window.gifEncoder.setQuality(10); // Lower means better quality but larger file
    window.gifEncoder.setSize(canvas.width, canvas.height);
    window.gifEncoder.start();

    // Set recording flag
    window.isRecordingGif = true;
    window.recordingStartTime = Date.now();

    // Update export button text
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      // "Stop Recording";
      exportBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-disc2-icon lucide-disc-2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 12h.01" /></svg>';
      exportBtn.style.backgroundColor = "#e74c3c";
    }

    // Show recording indicator
    const recordingIndicator = document.createElement("div");
    recordingIndicator.id = "recording-indicator";
    recordingIndicator.textContent = "Recording GIF...";
    recordingIndicator.style.position = "fixed";
    recordingIndicator.style.top = "10px";
    recordingIndicator.style.left = "50%";
    recordingIndicator.style.transform = "translateX(-50%)";
    recordingIndicator.style.backgroundColor = "rgba(231, 76, 60, 0.8)";
    recordingIndicator.style.color = "white";
    recordingIndicator.style.padding = "5px 15px";
    recordingIndicator.style.borderRadius = "5px";
    recordingIndicator.style.zIndex = "1000";
    document.body.appendChild(recordingIndicator);

    // Start capturing frames
    window.captureFrame();

    // Show notification
    window.Utils.showNotification(
      "GIF recording started. Click Export again to stop."
    );
  } catch (error) {
    console.error("Error starting GIF recording:", error);
    window.Utils.showNotification(
      "Error starting GIF recording. Check console for details.",
      "error"
    );
    window.isRecordingGif = false;
  }
};

// Capture a frame for the GIF
window.captureFrame = function () {
  if (!window.isRecordingGif) return;

  try {
    // Create an offscreen canvas, draw the current canvas and credit onto it,
    // then pass its context to the GIF encoder so exported GIFs include the credit.
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d");
    // draw background then current canvas
    offCtx.fillStyle = window.darkMode ? "#1e1e1e" : "#ffffff";
    offCtx.fillRect(0, 0, off.width, off.height);
    offCtx.drawImage(canvas.canvas, 0, 0);
    // draw credit
    try {
      drawCreditOnContext(offCtx, off.width, off.height, {
        text: "Created using https://jes24.github.io/CGViz/",
        fontSize: 18,
      });
    } catch (e) {
      // pass - non-fatal
    }
    // Add frame to encoder (pass the offscreen context)
    window.gifEncoder.addFrame(offCtx);

    // Check if recording should stop (max duration reached) | TODO: Make this configurable
    if (Date.now() - window.recordingStartTime >= window.recordingDuration) {
      window.stopGifRecording();
      return;
    }

    // Schedule next frame capture
    setTimeout(window.captureFrame, window.recordingInterval);
  } catch (error) {
    console.error("Error capturing frame:", error);
    window.stopGifRecording();
  }
};

// Stop recording and save GIF
window.stopGifRecording = function (filename) {
  if (!window.isRecordingGif) return;

  try {
    // Finish encoding
    window.gifEncoder.finish();

    // Get GIF data
    const gifData =
      "data:image/gif;base64," + encode64(window.gifEncoder.stream().getData());

    // Use Utils.downloadDataUrl if available
    const outName = `${filename || "algorithm-recording"}.gif`;
    if (window.Utils && typeof window.Utils.downloadDataUrl === "function") {
      window.Utils.downloadDataUrl(gifData, outName);
    } else {
      // Create download link
      const link = document.createElement("a");
      link.href = gifData;
      link.download = outName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Reset recording state
    window.isRecordingGif = false;

    // Update export button text
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>';

      exportBtn.style.backgroundColor = "";
    }

    // Remove recording indicator
    const recordingIndicator = document.getElementById("recording-indicator");
    if (recordingIndicator) {
      document.body.removeChild(recordingIndicator);
    }

    // Show success notification
    window.Utils.showNotification("GIF exported successfully!");
  } catch (error) {
    console.error("Error saving GIF:", error);
    window.Utils.showNotification(
      "Error saving GIF. Check console for details.",
      "error"
    );

    // Reset recording state
    window.isRecordingGif = false;

    // Update export button text
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>';
      exportBtn.style.backgroundColor = "";
    }

    // Remove recording indicator
    const recordingIndicator = document.getElementById("recording-indicator");
    if (recordingIndicator) {
      document.body.removeChild(recordingIndicator);
    }
  }
};

// Exports an animated GIF by iterating algorithm steps
window.exportStepsAsGif = async function (filenameBase) {
  const alg = window.algorithmManager.getCurrentAlgorithm();
  if (!alg || !Array.isArray(alg.steps) || alg.steps.length === 0) {
    throw new Error("No steps to export.");
  }

  // Preserve current state
  const originalStep =
    typeof alg.currentStep === "number" ? alg.currentStep : 0;
  const totalSteps = alg.steps.length;

  // Derive per-frame delay from speed slider (1..10). Faster speed -> shorter delay.
  const speedEl = document.getElementById("speed-slider");
  const speed = speedEl
    ? Math.max(1, Math.min(10, parseInt(speedEl.value, 10) || 5))
    : 5;
  const frameDelay = Math.max(100, 1200 - speed * 100); // 1100ms..100ms

  // Disable export button during processing
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.disabled = true;
    // "Exporting GIF…";
    exportBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-icon lucide-loader"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>';
  }

  try {
    // Init encoder
    const enc = new GIFEncoder();
    enc.setRepeat(0);
    enc.setQuality(10);
    enc.setSize(canvas.width, canvas.height);
    enc.start();

    const ctx = canvas.canvas.getContext("2d");

    const waitNextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < totalSteps; i++) {
      // Advance to step i
      alg.currentStep = i;
      // Allow one frame to render with p5 draw()
      await waitNextFrame();

      // Per-frame delay (embedded in GIF)
      enc.setDelay(frameDelay);
      // Create offscreen snapshot with credit for this step
      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const offCtx = off.getContext("2d");
      offCtx.fillStyle = window.darkMode ? "#1e1e1e" : "#ffffff";
      offCtx.fillRect(0, 0, off.width, off.height);
      offCtx.drawImage(canvas.canvas, 0, 0);
      try {
        drawCreditOnContext(offCtx, off.width, off.height, {
          text: "Created using https://jes24.github.io/CGViz/",
          fontSize: 18,
        });
      } catch (e) {}
      enc.addFrame(offCtx);

      // Optional pacing between captures to avoid UI jank
      await sleep(10);
    }

    // Finish and save
    enc.finish();
    const data = "data:image/gif;base64," + encode64(enc.stream().getData());
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `${filenameBase || "algorithm-steps"}-steps-${ts}.gif`;
    // Prefer Utils.downloadDataUrl if available
    if (window.Utils && typeof window.Utils.downloadDataUrl === "function") {
      window.Utils.downloadDataUrl(data, name);
    } else {
      const a = document.createElement("a");
      a.href = data;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    window.Utils.showNotification("Steps GIF exported successfully!");
  } finally {
    // Restore state and UI
    alg.currentStep = originalStep;
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>';
    }
  }
};
