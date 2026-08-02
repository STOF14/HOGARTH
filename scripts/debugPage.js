const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG>', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR>', err.message));
  page.on('requestfailed', req => console.log('REQUEST FAILED>', req.url(), req.failure() && req.failure().errorText));
  await page.goto('http://localhost:5175/');
  console.log('Loaded');
  await page.waitForTimeout(5000);
  await browser.close();
})();
