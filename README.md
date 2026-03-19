# Umamusume Trackblazer Planner — GitHub Pages Edition

This version is fully static and is meant to be published on GitHub Pages.

## What changed

- The Python backend was removed.
- The optimizer now runs in the browser.
- Race and epithet data are loaded from local JSON files.
- The UI keeps the same route-planning workflow: aptitudes, weights, manual turn locks, auto-rebuilds, and per-turn tile values.

## How it works

- `index.html` loads the app UI.
- `app.js` handles the user interface and auto-updating behavior.
- `solver-browser.js` ports the schedule optimizer into JavaScript and solves the model in-browser using a WebAssembly MILP solver.
- `races.json` and `epithets.json` are the data files.

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload all files from this folder to the repository root.
3. In the repository settings, open **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Pick your main branch and the **/(root)** folder.
6. Save.

After GitHub Pages finishes publishing, your planner will be live at a URL like:

`https://<your-username>.github.io/<your-repo>/`

## Notes

- This version uses **relative file paths**, so it works from a project-site URL with a repo subfolder.
- The solver library is loaded from a CDN at runtime. If you later want the site to be fully self-contained, the JS/WASM solver assets can be vendored into the repo.
- Each page load starts fresh. No localStorage or cookies are used.
