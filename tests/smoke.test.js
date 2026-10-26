const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

assert.match(html, /id="siteCanvas"/, 'canvas root exists');
assert.match(html, /id="inspectorContent"/, 'inspector exists');
assert.match(html, /<script src="app\.js"><\/script>/, 'application script is loaded');
assert.match(app, /localStorage\.setItem\(PROJECT_KEY/, 'project persistence is implemented');
assert.match(app, /function renderPagesPanel\(/, 'page management is implemented');
assert.match(app, /function renderAssetsPanel\(/, 'asset management is implemented');
assert.match(app, /function downloadCurrentPage\(/, 'publish action exports a page instead of falsely claiming deployment');
assert.match(app, /function duplicateSelected\(/, 'element duplication is implemented');

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const dynamicIds = new Set(['nodeText', 'newPage', 'renamePage', 'duplicatePage', 'deletePage', 'assetUpload', 'exportSettings', 'classNameInput', 'applyClass', 'collectionName', 'createCollection', 'interactionEvent', 'interactionAction', 'interactionValue', 'addInteraction', 'customCss', 'customJs', 'saveCustomCode']);
const referencedIds = new Set([...app.matchAll(/\$\('#([A-Za-z][\w-]*)'/g)].map(m => m[1]));
const missing = [...referencedIds].filter(id => !htmlIds.has(id) && !dynamicIds.has(id));
assert.deepEqual(missing, [], 'static app selectors should point to existing or documented dynamic IDs');

console.log('CodeStruct smoke checks passed.');
