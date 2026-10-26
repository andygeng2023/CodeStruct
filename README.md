# CodeStruct Visual Editor

A Webflow-inspired visual website editor interface built with plain HTML, CSS, and JavaScript. It runs without a build step or framework.

## Run locally

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the directory using a local static server.
3. Use the left rail to open the element library and navigator.
4. Add elements, select sections on the canvas, and edit content and styles in the inspector.
5. Use the viewport controls to preview desktop, tablet, and mobile widths.
6. Choose **Code** / **Export HTML** to copy a snapshot of the current canvas markup.

## Included

- Responsive four-area editor shell with element library, canvas, navigator, and style inspector.
- Starter landing-page canvas and element insertion for sections, containers, columns, headings, paragraphs, buttons, links, images, video placeholders, dividers, quotes, and forms.
- Canvas element selection, editable text, CSS styling controls, IDs, deletion, and element naming.
- Desktop/tablet/mobile canvas widths, zoom controls, undo/redo, keyboard shortcuts, and HTML export.
- Preview mode and a publish-dialog prototype.

## Current limitations

This is an interactive front-end editor foundation, not a complete Webflow replacement or production publishing platform. Projects are not persisted to a database; refreshes reset changes. Asset upload, multi-page routing, reusable components, CMS/data bindings, visual interaction workflows, code-component execution, authentication, collaboration, and deployment/custom-domain publishing are not implemented. The Publish action only marks the current draft locally. Exported markup uses the repository stylesheet reference and is not a complete self-contained production export.

No build or dependency installation is required. Serve this folder with any static web server or deploy it as a static site. Hosting configuration and end-to-end browser tests still need to be added before production release.
