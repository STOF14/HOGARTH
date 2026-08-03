const { test, expect } = require('@playwright/test');
const { PDFDocument, rgb } = require('pdf-lib');

async function skipBoot(page){
  await page.goto('/');
  await page.locator('button:has-text("Skip")').click({ timeout: 8000 }).catch(() => {});
}

async function makeTestPdf(pageCount = 2){
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++){
    const page = doc.addPage([200, 260]);
    // Different fill color per page so this could later be extended into
    // an actual color-extraction assertion if useful.
    page.drawRectangle({ x: 0, y: 0, width: 200, height: 260, color: rgb(i === 0 ? 0.8 : 0.2, 0.3, 0.3) });
  }
  return Buffer.from(await doc.save());
}

test('uploading a real PDF adds a plot and its lamp lights', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });

  const pdfBuffer = await makeTestPdf(2);
  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({ name: 'test-comic.pdf', mimeType: 'application/pdf', buffer: pdfBuffer });

  // PDF rendering (canvas rasterization per page) is slower than ZIP
  // extraction, so this needs a longer settle window than the CBZ test.
  await page.waitForTimeout(3500);
  const text = await page.locator('#hogarth-hud').textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});

test('uploading a corrupt PDF shows a decode-error dialog instead of failing silently', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });

  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 this is not actually a valid pdf body')
  });

  await page.waitForSelector('#hogarth-decode-error', { timeout: 8000 });
  await expect(page.locator('#hogarth-decode-error')).toContainText('Could not add');
});
