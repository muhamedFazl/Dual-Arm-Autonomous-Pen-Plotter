import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
      
      const screenshotPath = path.join(__dirname, 'app-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      console.log(`Screenshot saved to: ${screenshotPath}`);
  } catch (err) {
      console.error('Error capturing screenshot:', err);
  } finally {
      await browser.close();
  }
})();
