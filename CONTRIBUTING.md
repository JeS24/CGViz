# Contributing to CGViz

Thank you for your interest in contributing! This project is a static HTML/CSS/JS webapp that uses small modules under `js/` and renders with `p5.js`. The guidelines below will help your contribution get reviewed quickly.

## Quick checklist

- Look for open issues or open a new one to discuss larger changes.
- Fork the repo and create a feature branch from `main` (or the branch you're targeting).
- Keep changes small and focused. Include a screenshot or short GIF for UI changes where helpful.
- See the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines and use the issue/PR templates in `.github/` when opening new issues or PRs:

- Bug report: [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
- Feature request: [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
- PR template: [.github/pull_request_template.md](.github/pull_request_template.md)

## Local setup

Serve the site from the project root using one of the methods in the main README (you may need to install Python or Node.js/npm first):

```bash
# Python 3 (bash/zsh/PowerShell)
python -m http.server 8000

# npm (install once)
npm install -g http-server
http-server -p 8000
```

Or use the VS Code Live Server extension and open `index.html` with "Open with Live Server".

> Notes: Use a modern desktop browser (Firefox, Brave, Edge, Chrome). If you see CORS or file:// issues, run a local server instead of opening `index.html` directly.

## Code guidelines

- JavaScript: Follow the existing style in `js/` (ES5/ES6 mix). Keep modules focused, but _prefer clarity over brevity_.
- Files to touch for algorithm additions:

  1. `js/algorithms/<your-algo>.js` — implement a step-based API (inputs, computeSteps, getCurrentStep, next, prev, reset).
  2. `js/main.js` — add rendering glue or expose a renderer hook so the UI can draw your algorithm state.
  3. `index.html` and `ui/controls.js` — wire any controls or selectors necessary for the algorithm.

- Add comments for non-obvious math/geometry code and cite references where appropriate.

## Project Structure

**`js/`**

- `main.js` - sets up the p5 canvas, main draw loop, pan/zoom and the renderer glue that dispatches to per-algorithm draw routines
- `ui/controls.js` - sidebar controls: algorithm selector, step navigation, playback, randomizers, toggles and export wiring
- `export-utils.js` - helpers to export canvas content (PNG/JPG/SVG/PDF/GIF)
- `geometry/` - `point.js`, `line.js`, `polygon.js`, `interval.js`, `rectangle.js`, `dualLine.js` - small, focused classes for primitives used throughout the visualizations
  - These are intentionally simple and educational; for reference, consult a grade-school geometry text or see: "Computational Geometry & Computer Graphics in C++" by Michael J. Laszlo
- `algorithms/` - self-contained modules that compute step-by-step states for each visualization. Look inside `js/algorithms/` for implementations and in-file references/resources

## Testing your changes

- Manual testing: Run a local server and properly check the UI. Test exports (PNG/SVG/GIF/PDF) and step navigation for your algorithm.
- Keep accessibility in mind: keyboard controls and focus behavior are important for the interactive canvas.
- **Future Note**: Once the site is responsive on phones, test on mobile browsers via local network or device emulation.

## Pull requests

- Write a clear PR title and description. Explain the problem, the change, and any user-visible impact.
- Link to any related issue or discussion.
- Include screenshots or short GIFs for visual changes.

## Small maintenance notes

- Avoid adding large third-party libraries unless necessary. If you must, explain why and prefer small, focused packages.
- When updating dependencies or build tools, include rationale and test instructions in the PR.

## Questions

- If you're unsure where to start, open an issue describing the feature you'd like to add and tag it with "help wanted".

Thanks again — contributions make this project better!
