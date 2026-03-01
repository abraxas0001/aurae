const express = require('express');
const router = express.Router();
const { chatWithChef } = require('../services/chef');
const { generateRecipeImage } = require('../services/gemini');

// Chat with the Master Chef
router.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Initialize or retrieve conversation history from session
  if (!req.session.chefHistory) {
    req.session.chefHistory = [];
  }

  try {
    const { reply, imagePrompt } = await chatWithChef(message.trim(), req.session.chefHistory);

    // Append to conversation history (Gemini format)
    req.session.chefHistory.push(
      { role: 'user', parts: [{ text: message.trim() }] },
      { role: 'model', parts: [{ text: reply }] }
    );

    // Cap history at 20 exchanges (40 entries) to prevent token overflow
    if (req.session.chefHistory.length > 40) {
      req.session.chefHistory = req.session.chefHistory.slice(-40);
    }

    // If there's an image prompt, generate the image
    let imageUrl = null;
    if (imagePrompt) {
      try {
        imageUrl = await generateRecipeImage(imagePrompt);
      } catch (imgErr) {
        console.error('Chef image generation failed:', imgErr.message);
      }
    }

    res.json({ reply, imageUrl });
  } catch (err) {
    console.error('Chef chat error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', { message: err.message, name: err.name });
    res.status(500).json({ 
      error: 'The Master Chef is taking a break. Please try again.',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message 
    });
  }
});

// Reset conversation
router.post('/reset', (req, res) => {
  req.session.chefHistory = [];
  res.json({ ok: true });
});

module.exports = router;
