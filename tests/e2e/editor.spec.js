const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#siteCanvas')).toBeVisible();
});

test('adds elements and persists edits across reload', async ({ page }) => {
  await page.locator('[data-add="Heading"]').click();
  const canvas = page.locator('#siteCanvas');
  await expect(canvas.locator('[data-node="heading"]')).toHaveCount(1);
  await page.locator('#nodeText').fill('Browser-tested heading');
  await page.locator('#nodeText').dispatchEvent('change');
  await expect(page.locator('#saveStatus')).toContainText('All changes saved');
  await page.reload();
  await expect(page.locator('#siteCanvas')).toContainText('Browser-tested heading');
});

test('creates linked component instances and updates the component template', async ({ page }) => {
  await page.locator('[data-add="Heading"]').click();
  await page.locator('#nodeText').fill('Reusable heading');
  await page.locator('#nodeText').dispatchEvent('change');
  await page.locator('[data-panel="components"]').click();
  await page.locator('#componentName').fill('Shared hero');
  await page.locator('#saveComponent').click();
  await expect(page.locator('#siteCanvas [data-component-id]')).toHaveCount(1);
  await page.locator('[data-insert-component="Shared hero"]').click();
  await expect(page.locator('#siteCanvas [data-component-id]')).toHaveCount(2);
  await page.locator('#nodeText').fill('Updated shared hero');
  await page.locator('#nodeText').dispatchEvent('change');
  await page.locator('[data-panel="components"]').click();
  await page.locator('[data-refresh-component="Shared hero"]').click();
  await expect(page.locator('#siteCanvas [data-component-id]')).toContainText('Updated shared hero');
});

test('exports breakpoint CSS and animation timeline presets', async ({ page }) => {
  await page.locator('[data-add="Section"]').click();
  await page.locator('[data-viewport="mobile"]').click();
  await page.locator('#paddingInput').fill('12px');
  await page.locator('#paddingInput').dispatchEvent('change');
  await page.locator('[data-panel="settings"]').click();
  await page.locator('#animPreset').selectOption('rise');
  await page.locator('#animDelay').fill('250');
  await page.locator('#animDuration').fill('900');
  await page.locator('#applyAnim').click();
  const exported = await page.evaluate(() => window.CodeStructEditor.getExportHTML());
  expect(exported).toContain('@media(max-width:767px)');
  expect(exported).toContain('@keyframes csRise');
  expect(exported).toContain('data-anim-preset="rise"');
});

test('creates multiple pages and exports every page', async ({ page }) => {
  page.once('dialog', dialog => dialog.accept('About'));
  await page.locator('[data-panel="pages"]').click();
  await page.locator('#newPage').click();
  const result = await page.evaluate(() => window.CodeStructEditor.getAllExportHTML());
  expect(result).toHaveProperty('home');
  expect(result).toHaveProperty('about');
  expect(result.about).toContain('<!doctype html>');
});

test('binds a selected container to a dynamic CMS collection', async ({ page }) => {
  await page.locator('[data-add="Container"]').click();
  await page.locator('[data-panel="cms"]').click();
  await page.locator('#collectionName').fill('Blog posts');
  await page.locator('#createCollection').click();
  await expect(page.locator('#bindCmsCollection option[value="Blog posts"]')).toHaveCount(1);
  await page.locator('#bindCmsCollection').selectOption('Blog posts');
  await page.locator('#bindCmsList').click();
  await expect(page.locator('#siteCanvas [data-cms-list="Blog posts"]')).toHaveCount(1);
});
