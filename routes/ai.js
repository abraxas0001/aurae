const express = require('express');
const router = express.Router();
const { generateRecipeContent, generateRecipeImage } = require('../services/gemini');

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

module.exports = router;
