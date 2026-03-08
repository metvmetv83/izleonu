const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
  res.send('<h1>Stream Proxy Server</h1><p>Kullanım: /stream/[ID] veya /proxy?url=[URL]</p>');
});

// ID doğrudan erişimi için yönlendirme
app.get('/:id', (req, res, next) => {
  if (/^\d+$/.test(req.params.id)) {
    return res.redirect(`/stream/${req.params.id}`);
  }
  next();
});

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing url parameter');
    
    // Dinamik base URL'yi al
    const baseUrl = await getBaseUrl();
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': baseUrl + '/',
        'Origin': baseUrl,
        'Accept': '*/*',
      },
    });
    
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('vnd.apple.mpegurl') || targetUrl.endsWith('.m3u8')) {
      const text = await response.text();
      const proxiedText = text
        .split('\n')
        .map(line => {
          if (
            line.trim() !== '' &&
            !line.startsWith('#') &&
            (line.startsWith('http') || line.endsWith('.ts') || line.endsWith('.m3u8'))
          ) {
            const encodedUrl = encodeURIComponent(line.trim());
            return `${req.protocol}://${req.get('host')}/proxy?url=${encodedUrl}`;
          }
          return line;
        })
        .join('\n');
      
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(proxiedText);
    }
    
    res.set('Content-Type', contentType);
    response.body.pipe(res);
  } catch (error) {
    res.status(500).send('Proxy error: ' + error.message);
  }
});

// Stream endpoint
app.get('/stream/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    // Dinamik base URL'yi al
    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/wp-content/themes/ikisifirbirdokuz/match-center.php?id=${id}`;
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    let m3u8Url = null;
    
    page.on('response', async (response) => {
      const responseUrl = response.url();
      if (responseUrl.includes('.m3u8') && responseUrl.includes('chunklist') && !m3u8Url) {
        m3u8Url = responseUrl;
      }
    });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    
    const waitUntil = Date.now() + 10000;
    while (!m3u8Url && Date.now() < waitUntil) {
      await new Promise(r => setTimeout(r, 500));
    }
    
    await browser.close();
    
    if (!m3u8Url) {
      return res.status(404).json({ success: false, message: 'M3U8 stream URL bulunamadı.' });
    }
    
    const proxiedUrl = `${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(m3u8Url)}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${id}.m3u8"`);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    
    const m3u8Response = await fetch(proxiedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!m3u8Response.ok) {
      return res.status(m3u8Response.status).send('M3U8 dosyası indirilemiyor.');
    }
    
    const m3u8Text = await m3u8Response.text();
    res.send(m3u8Text);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Düzeltilmiş getBaseUrl fonksiyonu
async function getBaseUrl() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://raw.githubusercontent.com/mehmetey03/doma/refs/heads/main/valid_url.txt', { 
      waitUntil: 'networkidle2',
      timeout: 20000 
    });

    const baseUrl = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/https?:\/\/[^\s]+/);
      return match ? match[0] : null;
    });

    if (!baseUrl) {
      throw new Error('Geçerli URL bulunamadı');
    }

    return baseUrl;
  } finally {
    await browser.close();
  }
}

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor.`);
});
