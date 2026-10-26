# CodeStruct Visual Website Editor

CodeStruct is a browser-based visual website editor with a multi-panel design workspace. It borrows common visual-builder concepts; it is not an exact Webflow clone or a production-equivalent alternative.

## Run locally

Open `index.html` in a modern browser, or run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Implemented in this client-side build

- Element palette and canvas selection, inline text editing, element deletion, duplication, drag reordering and basic container nesting.
- Style inspector for dimensions, spacing, display, alignment, typography, color, background, radius, opacity and element IDs.
- Desktop, tablet and mobile viewport presets, zoom, preview, undo/redo and keyboard shortcuts.
- Local auto-save and restore using browser storage.
- Local multi-page create, switch, rename, duplicate and delete.
- Local image asset upload and insertion into the canvas.
- A style-class name library, local CMS collection/item CRUD, simple click/hover interactions, and custom CSS/JavaScript snippets for export.
- Standalone HTML export for the current page with accessible stylesheet rules embedded where possible.
- Node syntax/smoke checks in GitHub Actions.

## Limitations that still matter

This is **not feature-parity with Webflow and is not yet production-ready**. CMS collections and assets are local to the browser, not cloud-backed. The current class library manages class names but is not a complete CSS cascade/style manager. Responsive viewport presets are canvas previews, not an independent breakpoint style system. Interactions are a small set of event actions, not a timeline-based animation engine. Custom code is not sandboxed or run in the editor; review exported code carefully. Export downloads only the current page and does not create a multi-page deployment bundle.

Not implemented here: production authentication, project database and cloud sync, collaboration/permissions, reusable component instances, full CMS publishing and dynamic bindings, full responsive style cascade, robust visual layout engine, animation timeline, production form handling, asset CDN, SEO/a11y auditing workflow, version history, automatic deployment, hosting/domain configuration, or comprehensive real-browser end-to-end tests. These require additional server infrastructure, browser automation, and deployment configuration rather than being safely represented by local UI controls.
