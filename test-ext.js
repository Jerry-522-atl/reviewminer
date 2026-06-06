const crypto = require('crypto');

let extPath = 'c:/users/17801/desktop/reviewminer/extensions/image-grabber-fresh';
extPath = extPath.replace(/\\/g, '/');

const hash = crypto.createHash('sha256').update(extPath).digest('hex');
let id = '';
for (let i = 0; i < 16; i++) {
  const byte = parseInt(hash.substr(i*2, 2), 16);
  id += 'abcdefghijklmnopqrstuvwxyz'[byte % 26];
}
console.log('Extension ID:', id);

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  // Navigate to popup directly in a new page
  const popupUrl = 'chrome-extension://' + id + '/popup.html';
  console.log('Trying to open:', popupUrl);

  try {
    const page = await context.newPage();
    await page.goto(popupUrl, { timeout: 5000 });
    await page.waitForTimeout(1000);
    const body = await page.evaluate(() => document.body.innerText);
    console.log('Popup body:', body.slice(0, 200));
    await page.close();
  } catch(e) {
    console.log('Error opening popup:', e.message);
  }

  console.log('Done');
})();
