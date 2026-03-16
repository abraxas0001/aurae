const express = require('express');
const router = express.Router();
const {
  buildSvgFallback,
  buildStockPhotoUrl,
  generateRecipeContent,
  generateNanoBananaImage,
  generateRecipeImage,
  normalizeImageTitle
} = require('../services/gemini');

// API endpoint: generate recipe content via AI
router.post('/generate', async (req, res) => {
  const { title, category } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const data = await generateRecipeContent(title, category || 'dinner');
    res.json(data);
  } catch (err) {
    console.error('AI generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate recipe content' });
  }
});

// API endpoint: generate recipe image via AI
router.post('/generate-image', async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const imageUrl = await generateRecipeImage(title);
    res.json({ imageUrl });
  } catch (err) {
    console.error('AI image generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

router.get('/image', async (req, res) => {
  const cleanedTitle = normalizeImageTitle(req.query.title);

  if (!cleanedTitle) {
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(decodeURIComponent(buildSvgFallback('Aurae recipe').split(',')[1]));
  }

  const seed = String(req.query.seed || '').trim();

  try {
    const nanoImage = await generateNanoBananaImage(cleanedTitle, seed);
    const buffer = Buffer.from(nanoImage.data, 'base64');

    res.set('Content-Type', nanoImage.mimeType);
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.set('x-aurae-image-source', 'nano-banana');
    return res.send(buffer);
  } catch (err) {
    console.error('AI image proxy error:', err.message);

    try {
      const stockUrl = buildStockPhotoUrl(cleanedTitle, seed);
      const stockResponse = await fetch(stockUrl, {
        headers: {
          Accept: 'image/*'
        }
      });

      if (!stockResponse.ok) {
        throw new Error(`Stock image request failed with ${stockResponse.status}`);
      }

      const contentType = stockResponse.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await stockResponse.arrayBuffer());

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.set('x-aurae-image-source', 'stock-fallback');
      return res.send(buffer);
    } catch (stockErr) {
      console.error('Stock image fallback failed:', stockErr.message);
      res.set('Content-Type', 'image/svg+xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300');
      res.set('x-aurae-image-source', 'svg-fallback');
      return res.send(decodeURIComponent(buildSvgFallback(cleanedTitle).split(',')[1]));
    }
  }
});

module.exports = router;
