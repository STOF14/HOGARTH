const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

// 1x1 transparent PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(PNG_BASE64, 'base64');

test('upload a real .cbz (zip) and the town accepts it', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#hogarth-hud', { timeout: 10000 });

  const zip = new JSZip();
  zip.file('0001.png', pngBuffer);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });

  const fileInputs = await page.$$('input[type=file]');
  if (!fileInputs || fileInputs.length === 0) throw new Error('No file input found');
  await fileInputs[0].setInputFiles({ name: 'sample.cbz', mimeType: 'application/zip', buffer: buf });

  await page.waitForTimeout(1200);
  const text = await page.locator('#hogarth-hud').textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});

test('uploading a .cbr shows the RAR-not-supported help dialog instead of failing silently', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#hogarth-hud', { timeout: 10000 });

  // Content doesn't matter here -- .cbr/.rar are rejected by extension
  // before any parsing is attempted, since real CBR files are RAR
  // archives, not ZIP, and this app doesn't have a RAR decoder.
  const zip = new JSZip();
  zip.file('0001.png', pngBuffer);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });

  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({ name: 'sample.cbr', mimeType: 'application/octet-stream', buffer: buf });

  await page.waitForSelector('#hogarth-rar-help', { timeout: 5000 });
  await expect(page.locator('#hogarth-rar-help')).toContainText('CBR (RAR) not supported');
});
