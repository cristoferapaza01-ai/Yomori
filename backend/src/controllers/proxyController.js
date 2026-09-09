import axios from 'axios';

export const proxyImage = async (req, res) => {
  try {
    const { url, referer } = req.query;

    if (!url) {
      return res.status(400).send('Falta el parámetro "url" para el proxy');
    }

    const decodedUrl = decodeURIComponent(url);
    const targetUrl = new URL(decodedUrl);
    let refererHeader = referer ? decodeURIComponent(referer) : `${targetUrl.protocol}//${targetUrl.hostname}`;
    let cookieHeader = '';
    let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

    let fetchUrl = decodedUrl;

    // Smart mapping para servidores de imágenes protegidos contra hotlinking (ej. Plot Twist)
    if (decodedUrl.includes('plotnofansub.com')) {
      const lower = decodedUrl.toLowerCase();
      if (lower.includes('grand-blue') || lower.includes('grand_blue')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/fffbfac3-b7ad-41ee-9581-b4d90ecec941/0c6c8758-6819-4262-9671-30d5989c0fb8.jpg.512.jpg';
      } else if (lower.includes('100novias') || lower.includes('100-novias')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/efb4278c-a761-406b-9d69-19603c5e4c8b/fd2c6a48-810e-4cb4-bd35-e90cef71e337.jpg.512.jpg';
      } else if (lower.includes('gokuarai') || lower.includes('gokurakugai')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/40c058a2-430e-4ced-b663-369dcf38583f/2824eeb9-042d-4c1c-bb1f-584d1c5a047a.jpg.512.jpg';
      } else if (lower.includes('misterios')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/16a16845-90d1-4895-b2b8-4895624588c7/57840582-4d5b-4787-96e1-24411b82d195.jpg.512.jpg';
      } else if (lower.includes('seitokai')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/822c9883-385c-4fd0-9523-16e7789cbeae/413e7df9-e4cc-4fcd-887f-a7bbafc1846e.jpg.512.jpg';
      } else if (lower.includes('boku')) {
        fetchUrl = 'https://uploads.mangadex.org/covers/4911120a-723f-4c36-af98-00dc2b7b2f76/6f2b8615-e93d-4352-866b-04ed7dd831c1.jpg.512.jpg';
      }
    }

    if (fetchUrl.includes('mangadex.org')) {
      refererHeader = 'https://mangadex.org/';
    } else if (fetchUrl.includes('skymangas.com')) {
      refererHeader = 'https://skymangas.com/';
    } else if (fetchUrl.includes('manhwalatino.lat') || fetchUrl.includes('manhwaweb.xyz')) {
      refererHeader = 'https://manhwalatino.lat/';
    } else if (fetchUrl.includes('leercapitulo.com')) {
      refererHeader = 'https://leercapitulo.com/';
    } else if (fetchUrl.includes('olympusxyz.com') || fetchUrl.includes('imagesolymp.xyz')) {
      refererHeader = 'https://olympusxyz.com/';
    } else if (fetchUrl.includes('plotnofansub.com')) {
      refererHeader = 'https://plotnofansub.com/';
      if (global.plotTwistCookieHeader) {
        cookieHeader = global.plotTwistCookieHeader;
      }
      if (global.plotTwistUserAgent) {
        userAgent = global.plotTwistUserAgent;
      }
    }

    const headers = {
      'User-Agent': userAgent,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Referer': refererHeader
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Petición HTTP con headers que simulan una petición legítima de imagen del navegador
    const response = await axios({
      method: 'GET',
      url: fetchUrl,
      responseType: 'stream',
      timeout: 20000,
      headers
    });

    // Pasar headers de tipo de contenido y permitir cacheo en navegador
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Pipe del stream de la imagen directamente al cliente
    response.data.pipe(res);

  } catch (error) {
    console.error(`[Proxy Error] Error al descargar imagen: ${req.query.url}`, error.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'No se pudo cargar la imagen desde el servidor de origen',
        details: error.message
      });
    }
  }
};
