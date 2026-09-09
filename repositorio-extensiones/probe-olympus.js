import { BrowserManager } from './base/BrowserManager.js';

async function probe() {
  console.log('--- Probing Olympusxyz.com ---');
  const browser = await BrowserManager.launchBrowser();
  const page = await BrowserManager.setupPage(browser);

  try {
    // 1. Probar la página de series / catálogo
    console.log('1. Cargando catálogo https://olympusxyz.com/series ...');
    await page.goto('https://olympusxyz.com/series', { waitUntil: 'networkidle2', timeout: 35000 });
    await BrowserManager.autoScroll(page, 5, 200);

    const catalog = await page.evaluate(() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a[href*="/series/comic-"]'));
      const seen = new Set();

      for (const a of links) {
        const url = a.href;
        if (!seen.has(url)) {
          seen.add(url);
          const img = a.querySelector('img');
          const title = a.textContent.trim() || (img ? img.alt : '') || '';
          const cover = img ? (img.src || img.getAttribute('data-src')) : '';
          items.push({ title, url, cover });
        }
      }
      return items;
    });

    console.log(`Catálogo encontrado: ${catalog.length} mangas/series.`);
    console.log('Muestra de 3 mangas:', catalog.slice(0, 3));

    if (catalog.length > 0) {
      const targetManga = catalog[0];
      console.log(`\n2. Probando detalles de manga: ${targetManga.url} ...`);
      await page.goto(targetManga.url, { waitUntil: 'networkidle2', timeout: 35000 });
      await BrowserManager.autoScroll(page, 8, 200);

      const mangaDetails = await page.evaluate(() => {
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const synopsis = document.querySelector('p')?.textContent?.trim() || '';
        const cover = document.querySelector('img[src*="covers"], img[src*="media"], .cover img')?.src || '';
        
        // Obtener lista de capítulos
        const chapterLinks = Array.from(document.querySelectorAll('a[href*="/capitulo/"]')).map(a => ({
          name: a.textContent.trim().replace(/\s+/g, ' '),
          url: a.href
        }));

        return {
          title,
          synopsis: synopsis.slice(0, 150),
          cover,
          totalChapters: chapterLinks.length,
          firstChapters: chapterLinks.slice(0, 5)
        };
      });

      console.log('Detalles del Manga extraídos:', mangaDetails);

      if (mangaDetails.firstChapters.length > 0) {
        const targetChapter = mangaDetails.firstChapters[0];
        console.log(`\n3. Probando visor de capítulo: ${targetChapter.url} ...`);
        await page.goto(targetChapter.url, { waitUntil: 'networkidle2', timeout: 35000 });
        await BrowserManager.autoScroll(page, 15, 200);

        const chapterPages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src || i.getAttribute('data-src')).filter(s => s && s.startsWith('http') && !s.includes('logo') && !s.includes('avatar'));
          return {
            title: document.title,
            totalImages: imgs.length,
            sample: imgs.slice(0, 5)
          };
        });

        console.log('Capítulo extraído con éxito:', chapterPages);
      }
    }

  } catch (error) {
    console.error('Error en probe:', error);
  } finally {
    await BrowserManager.safeClose(browser);
  }
}

probe();
