const { test, expect } = require('@playwright/test');

test('app boots and HUD mounts; mock add updates town', async ({ page }) => {
  await page.goto('/');
  // wait for HUD created by TownScene
  await page.waitForSelector('#hogarth-hud', { timeout: 15000 });
  const hud = await page.locator('#hogarth-hud');
  await expect(hud).toContainText('Town');

  // debug: dump HUD innerHTML to logs to inspect buttons
  const hudHtml = await page.$eval('#hogarth-hud', el => el.innerHTML);
  console.log('HUD HTML:', hudHtml);

  // Click the Mock Add button and ensure HUD updates
  await page.waitForSelector('text=Mock Add', { timeout: 10000 });
  await page.click('text=Mock Add');
  // small delay for the scene to react
  await page.waitForTimeout(600);
  const text = await hud.textContent();
  expect(text).toMatch(/Town \u2014 \d+ plot/);
});

test('legacy reader page loads and has reader UI', async ({ page }) => {
  await page.goto('/stages/stage5-enter-reader.html');
  await page.waitForSelector('#reader', { timeout: 10000 });
  await expect(page.locator('#reader .readerTop')).toBeVisible();
});
