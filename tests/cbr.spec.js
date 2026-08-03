const { test, expect } = require('@playwright/test');

// IMPORTANT LIMITATION: there is no legally-distributable way to generate a
// real RAR archive from an automated test (RAR compression is proprietary;
// no open-source encoder exists to depend on here). node-unrar-js only
// decodes RAR, it doesn't create RAR. So this file can only verify the
// error-handling path automatically. A real .cbr upload -- confirming
// actual RAR pages decode and display correctly -- needs to be checked
// manually with a genuine RAR file. See docs/QA_CHECKLIST.md.

async function skipBoot(page){
  await page.goto('/');
  await page.locator('button:has-text("Skip")').click({ timeout: 8000 }).catch(() => {});
}

test('uploading a corrupt/fake .cbr shows a decode-error dialog instead of failing silently', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });

  const fileInputs = await page.$$('input[type=file]');
  await fileInputs[0].setInputFiles({
    name: 'broken.cbr',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('this is not a real rar file')
  });

  await page.waitForSelector('#hogarth-decode-error', { timeout: 8000 });
  await expect(page.locator('#hogarth-decode-error')).toContainText('Could not add');
});
