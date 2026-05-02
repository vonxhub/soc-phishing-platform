import express from 'express';
import puppeteer from 'puppeteer';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 10 }));

// Redirect chain limit to prevent memory growth
const MAX_REDIRECT_HOPS = 10;

app.post('/analyze', async (req, res) => {
  const { url, screenshotPath } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--no-zygote',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ],
    });

    const page = await browser.newPage();
    const redirectChain: string[] = [];
    page.on('request', (req: any) => {
      if (req.isNavigationRequest() && redirectChain.length < MAX_REDIRECT_HOPS) {
        redirectChain.push(req.url());
      }
    });

    let finalUrl = url;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      finalUrl = page.url();
      if (screenshotPath) {
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }
    } catch (e) {
      console.error(`Error during page navigation: ${e}`);
    }

    res.json({
      finalUrl,
      redirectChain: [...new Set(redirectChain)], // unique
      malicious: redirectChain.length > 2,
      indicators: redirectChain.length > 2 ? [{
        type: 'warning',
        label: 'Suspicious redirect chain',
        severity: 5
      }] : [],
    });
  } catch (err) {
    console.error(`Sandbox error: ${err}`);
    res.status(500).json({ error: 'Sandbox analysis failed' });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => console.log('Sandbox worker ready'));
