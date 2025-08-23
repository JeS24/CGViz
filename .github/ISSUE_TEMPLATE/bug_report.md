---
name: Bug report
about: Create a report to help us fix a bug
labels: bug
---

**Describe the bug**
A clear and concise description of what the bug is.

**To reproduce**
Steps to reproduce the behavior (be as specific as possible):

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots / GIF**
If applicable, add screenshots or a short GIF to help explain the problem.

**Environment**

- OS: Linux / Windows / macOS (include version)
- Browser: Firefox / Brave / Edge / Chrome (include version)
- Branch: main / other

**Quick troubleshooting (please try before opening an issue)**

- Serve from a local HTTP server instead of opening `index.html` directly. Example (`bash/zsh/PowerShell`):

```bash
python -m http.server 8000
```

- If export (PNG/SVG/PDF/GIF) or GIF recording fails, try in Chrome/Edge and check the browser console for errors.
- If you see CORS or file:// errors, re-run using a local server (example above).

**Console / error output**
Paste any relevant console logs or error messages here.

**Additional context**
Add any other context about the problem here (input data used, config settings, randomizer settings, etc.).
