# Solar Year project workflow

## Automatic visual history — standing user requirement

After **every completed change that affects the website's appearance or interaction states**, capture the resulting whole-page views before reporting the change as finished. The user has authorized this permanently for this project: do not ask, do not remind them to run a command, and do not defer capture to another turn.

1. Implement and verify the change.
2. Run `npm run export:html -- --title "Short description of this change" --summary "What visibly changed and why."`. HTML export automatically captures changed versions, updates the gallery and creates the downloadable archive. If capture fails, investigate and fix it; do not claim documentation is complete until it succeeds.
3. Verify that every meaningful toggle state is represented on desktop and mobile. When adding or removing a visual state, update the capture script's `views` list and state assertions in the same change. Avoid hover/focus artifacts in the snapshots.
4. Inspect the relevant screenshots. Preserve all previous iteration folders; never overwrite or delete an earlier snapshot to make room for a new one.
5. Mention the archived iteration and provide the public history ZIP when useful. The user should not have to think about screenshots again.

`npm run export:html` also captures changes without extra arguments. Title/summary arguments are preferred for a useful presentation history. `npm run capture:iteration` explicitly captures a version even when its visual hash has not changed. Re-exporting unchanged input with `export:html` skips duplicate screenshots.

## Archive layout

`docs/iterations/` is the project-only archive. Each dated, numbered change folder contains:
- all full-page desktop and mobile PNGs;
- a readable README with the change title, summary and view links;
- a manifest with the exact capture date, fixed reference date/location, viewport sizes, toggle states and source hashes.

`docs/iterations/index.html` is an offline gallery for reviewing and presenting the history. `visual-history.zip` packages the complete archive. In the managed workspace, a readable copy is placed at `/workspace/Solar-Year-Visual-History.zip` for downloading.

## Keep documentation outside the product

Screenshots, the gallery, capture settings, Playwright and ZIP tooling are development/project documentation only. Do not import them into application code, put them in `public/`, add a history route/control to the website, embed them in `solar-year.html`, or include them in `dist/`. `npm run build` remains the production build and does not run screenshot tooling. Preserve this separation when changing build scripts.

The stable reference date and viewport settings live in `scripts/visual-history-settings.json`. Keep them consistent between changes for comparison; change them deliberately and explain the reason in the iteration summary.

Use the existing checkout. Do not create a Git worktree unless the user explicitly requests one. No sub-agent delegation is required by these instructions.
