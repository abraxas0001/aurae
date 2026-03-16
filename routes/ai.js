const express = require('express');
const router = express.Router();
const {
  buildSvgFallback,
  buildUpstreamImageUrl,
  generateRecipeContent,
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
  const upstreamUrl = buildUpstreamImageUrl(cleanedTitle, seed);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'image/*'
      }
    });

    if (!upstreamResponse.ok) {
      throw new Error(`Upstream image request failed with ${upstreamResponse.status}`);
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.send(buffer);
  } catch (err) {
    console.error('AI image proxy error:', err.message);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(decodeURIComponent(buildSvgFallback(cleanedTitle).split(',')[1]));
  }
});

module.exports = router;
