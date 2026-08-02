const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

// 1x1 transparent PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(PNG_BASE64, 'base64');

test('upload a .cbr (zip payload) and ensure town accepts it', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#hogarth-hud', { timeout: 10000 });

  // Build an in-memory ZIP with one page
  const zip = new JSZip();
  zip.file('0001.png', pngBuffer);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });

  // Upload as .cbr (CBR extension) to exercise extension handling
  // There are two inputs appended; pick the first file input in the page
  const fileInputs = await page.$$('input[type=file]');
  if (!fileInputs || fileInputs.length === 0) throw new Error('No file input found');
  // Set the file (Playwright will emit change event)
  await fileInputs[0].setInputFiles({ name: 'sample.cbr', mimeType: 'application/octet-stream', buffer: buf });

  // Wait a bit for processing and check HUD updated with a new plot
  await page.waitForTimeout(1200);
  const text = await page.locator('#hogarth-hud').textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});
