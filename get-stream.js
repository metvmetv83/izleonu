const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    const id = process.argv[2] || '5062';
    const url = `https://macizlevip315.shop/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;

    // Launch browser with more options
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // Set user agent and viewport to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    let m3u8Url = null;

    page.on('response', async (response) => {
      const reqUrl = response.url();
      if (reqUrl.includes('.m3u8') && reqUrl.includes('chunklist')) {
        m3u8Url = reqUrl;
        console.log('Found m3u8 URL:', m3u8Url); // Debug log
      }
    });

    // Navigate with longer timeout and different waitUntil option
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for potential JavaScript to load
    await page.waitForTimeout(5000);

    // Alternative: Wait for a specific selector if you know one
    // await page.waitForSelector('some-element', { timeout: 5000 });

    if (m3u8Url) {
      console.log('✅ Stream URL:', m3u8Url);
    } else {
      console.log('❌ m3u8 stream URL not found. Possible issues:');
      console.log('1. The stream might not be available');
      console.log('2. The page structure might have changed');
      console.log('3. Anti-bot measures might be in place');
      
      // Debug: Save screenshot and HTML
      await page.screenshot({ path: 'debug.png' });
      const html = await page.content();
      require('fs').writeFileSync('debug.html', html);
      console.log('Saved debug.png and debug.html for inspection');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
