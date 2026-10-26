const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const cloud = fs.readFileSync('cloud.js', 'utf8');
const cloudAssets = fs.readFileSync('cloud-assets.js', 'utf8');

assert.match(html, /id="siteCanvas"/, 'canvas root exists');
assert.match(html, /id="inspectorContent"/, 'inspector exists');
assert.match(html, /<script src="app\.js"><\/script>/, 'application script is loaded');
assert.match(app, /localStorage\.setItem\(PROJECT_KEY/, 'project persistence is implemented');
assert.match(app, /function renderPagesPanel\(/, 'page management is implemented');
assert.match(app, /function renderAssetsPanel\(/, 'asset management is implemented');
assert.match(app, /function downloadCurrentPage\(/, 'publish action exports a page instead of falsely claiming deployment');
assert.match(app, /function duplicateSelected\(/, 'element duplication is implemented');
assert.match(app, /function renderComponentsPanel\(/, 'reusable component snapshots are implemented');
assert.match(app, /function renderCmsPanel\(/, 'local CMS collection management is implemented');
assert.match(app, /function renderInteractionsPanel\(/, 'interaction rules panel is implemented');
assert.match(app, /function applyResponsiveBreakpoint\(/, 'responsive breakpoint overrides are implemented');
assert.match(cloud, /signInWithPassword/, 'cloud sign-in is wired');
assert.match(cloud, /from\('sytely_projects'\)/, 'cloud project storage uses the configured Supabase table');
assert.match(cloud, /postgres_changes/, 'cross-session update listener is implemented');
assert.match(app, /getExportHTML\(\)/, 'exported HTML can be generated for public hosting');
assert.match(cloud, /buildPublishedHTML\(/, 'publish embeds a standalone HTML snapshot');
assert.match(cloud, /showVersionHistory\(/, 'cloud version history is implemented');
assert.match(cloudAssets, /sytely-assets/, 'cloud asset storage integration is implemented');

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const dynamicIds = new Set(['nodeText', 'newPage', 'renamePage', 'duplicatePage', 'deletePage', 'assetUpload', 'exportSettings', 'classNameInput', 'applyClass', 'collectionName', 'createCollection', 'interactionEvent', 'interactionAction', 'interactionValue', 'addInteraction', 'customCss', 'customJs', 'saveCustomCode']);
const referencedIds = new Set([...app.matchAll(/\$\('#([A-Za-z][\w-]*)'/g)].map(m => m[1]));
const generatedIds = ['saveComponent', 'componentName', 'saveClassStyles', 'classPadding', 'classFontSize', 'classRadius', 'classTextColor', 'classBgColor', 'saveSiteSeo', 'seoCanonical', 'seoSocialImage', 'seoTitle', 'seoDescription', 'seoIndexable', 'runAccessibilityAudit', 'accessibilityResults'];
generatedIds.forEach(id => dynamicIds.add(id));
const missing = [...referencedIds].filter(id => !htmlIds.has(id) && !dynamicIds.has(id));
assert.deepEqual(missing, [], 'static app selectors should point to existing or documented dynamic IDs');

console.log('CodeStruct smoke checks passed.');
