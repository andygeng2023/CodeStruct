# CodeStruct Visual Website Editor

CodeStruct is a no-build, browser-based visual website editor inspired by the general workflow of tools such as Webflow. It is not an exact copy of Webflow and does not currently provide feature parity with its hosted design, CMS, collaboration, and publishing platform.

## Run

Open `index.html` in a modern browser, or serve this directory with a static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Current editor capabilities

- Four-region editor shell: tool rail, element/page/assets panel, responsive canvas, and style inspector.
- Starter page and element palette for sections, containers, columns, headings, paragraphs, buttons, links, image/video placeholders, dividers, quotes, and forms.
- Canvas selection, inline text editing, element naming and IDs, deletion, duplication (`Ctrl/Cmd+D)), and style controls for layout, spacing, typography, colors, radius, and opacity.
- Desktop, tablet, and mobile canvas viewport presets; zoom; undo/redo; keyboard shortcuts.
- Multiple local pages: create, switch, rename, duplicate, and delete pages.
- Image uploads stored in the current browser's local project, with uploaded images insertable onto the canvas.
- Automatic local browser storage for project pages, assets, and project name.
- HTML export and a standalone current-page HTML download with CSS embedded where the browser permits stylesheet access.
- Responsive preview mode and a keyboard-accessible selection baseline.

## Important limitations

This is an evolving client-side editor, **not a production-ready Webflow replacement**. Data is stored in the current browser profile only; there is no cloud database, login, team collaboration, permissions, CMS collections, dynamic data binding, reusable symbols/components, breakpoint-specific style model, full interaction timeline, code-component sandbox, SEO workflow, form backend, asset CDN, version history, or actual public deployment/custom-domain publishing. Multiple pages are managed locally, but the download action exports only the current page, not a multi-page site bundle. Large images may exceed browser local-storage quota. Exported pages should be reviewed and tested before production use.

No third-party dependencies or build step are required. The repository includes static validation via Node.js CI; browser-level interaction tests should be added before treating the editor as release-ready.
