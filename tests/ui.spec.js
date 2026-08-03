const { test, expect } = require('@playwright/test');

async function skipBoot(page){
  // The boot sequence auto-advances after ~4s, but tests shouldn't rely on
  // waiting through the full cinematic every run -- skip it explicitly.
  await page.goto('/');
  const skipBtn = page.locator('button:has-text("Skip")');
  await skipBtn.click({ timeout: 8000 }).catch(() => {});
}

test('app boots and HUD mounts; mock add updates town', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });
  const hud = page.locator('#hogarth-hud');
  await expect(hud).toContainText('Town');

  await page.waitForSelector('text=Mock Add', { timeout: 10000 });
  await page.click('text=Mock Add');
  await page.waitForTimeout(600);
  const text = await hud.textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});

test('boot sequence reaches the town without the skip button (full cinematic)', async ({ page }) => {
  test.slow(); // this one deliberately waits out the whole animation
  await page.goto('/');
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });
  await expect(page.locator('#hogarth-hud')).toContainText('Town');
});

test('the canvas fills the viewport rather than rendering tiny in a corner', async ({ page }) => {
  await skipBoot(page);
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });
  const canvas = page.locator('#app canvas').first();
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  // Allow a little slack, but the canvas should be filling the screen,
  // not sitting at its tiny internal render resolution.
  expect(box.width).toBeGreaterThan(viewport.width * 0.9);
  expect(box.height).toBeGreaterThan(viewport.height * 0.9);
});

test('legacy reader page loads and has reader UI', async ({ page }) => {
  await page.goto('/stages/stage5-enter-reader.html');
  await page.waitForSelector('#reader', { timeout: 10000 });
  await expect(page.locator('#reader .readerTop')).toBeVisible();
});
