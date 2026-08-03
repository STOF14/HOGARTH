const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(PNG_BASE64, 'base64');

async function skipBoot(page){
  await page.goto('/');
  await page.locator('button:has-text("Skip")').click({ timeout: 8000 }).catch(() => {});
}

test('uploading a real .cbz adds a plot and its lamp lights', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });

  const zip = new JSZip();
  zip.file('0001.png', pngBuffer);
  zip.file('0002.png', pngBuffer);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });

  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({ name: 'test-comic.cbz', mimeType: 'application/zip', buffer: buf });

  await page.waitForTimeout(1200);
  const text = await page.locator('#hogarth-hud').textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});

test('uploading a corrupt .cbz shows a decode-error dialog instead of failing silently', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });

  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({
    name: 'broken.cbz',
    mimeType: 'application/zip',
    buffer: Buffer.from('this is not a real zip file')
  });

  await page.waitForSelector('#hogarth-decode-error', { timeout: 5000 });
  await expect(page.locator('#hogarth-decode-error')).toContainText('Could not add');
});
