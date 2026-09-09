import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export class BrowserManager {
  static sharedBrowser = null;
  static isLaunching = false;

  /**
   * Obtiene o inicializa la instancia caliente del navegador (Pool Singleton)
   */
  static async getSharedBrowser() {
    if (this.sharedBrowser && this.sharedBrowser.isConnected()) {
      return this.sharedBrowser;
    }

    if (this.isLaunching) {
      while (this.isLaunching) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (this.sharedBrowser && this.sharedBrowser.isConnected()) {
        return this.sharedBrowser;
      }
    }

    this.isLaunching = true;
    try {
      console.log('[BrowserManager] 🚀 Inicializando instancia caliente de Chromium...');
      this.sharedBrowser = await this.launchBrowser();
      
      this.sharedBrowser.on('disconnected', () => {
        console.warn('[BrowserManager] Chromium se ha desconectado. Se reiniciará en la próxima petición.');
        this.sharedBrowser = null;
      });

      return this.sharedBrowser;
    } finally {
      this.isLaunching = false;
    }
  }

  static async launchBrowser(customArgs = []) {
    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--window-size=1366,768',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      ...customArgs
    ];

    return await puppeteer.launch({
      headless: 'new',
      args: defaultArgs,
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1366,
        height: 768,
        deviceScaleFactor: 1
      }
    });
  }

  /**
   * Abre una nueva pestaña optimizada usando el navegador en caliente
   */
  static async createWarmPage(options = {}) {
    const browser = await this.getSharedBrowser();
    const page = await this.setupPage(browser, options);
    return { browser, page };
  }

  static async setupPage(browser, options = {}) {
    const page = await browser.newPage();

    const userAgent = options.userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    
    await page.setUserAgent(userAgent);
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      ...(options.headers || {})
    });

    page.setDefaultNavigationTimeout(options.timeout || 35000);
    page.setDefaultTimeout(options.timeout || 25000);

    return page;
  }

  static async autoScroll(page, maxScrolls = 15, delayMs = 150) {
    await page.evaluate(async (maxScrolls, delayMs) => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 700;
        let scrolls = 0;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrolls++;

          if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, delayMs);
      });
    }, maxScrolls, delayMs);
  }

  /**
   * Cierra únicamente la pestaña para reciclar memoria sin tumbar el navegador
   */
  static async closePage(page) {
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (err) {
        console.warn('[BrowserManager] Error cerrando página:', err.message);
      }
    }
  }

  static async safeClose(browser) {
    // En modo pool, no cerramos el navegador global para mantener la velocidad
  }
}
