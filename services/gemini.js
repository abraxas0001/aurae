const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Debug: Log API key info (first 15 chars only for security)
console.log('[Gemini] API Key loaded:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'MISSING');

async function generateRecipeContent(title, category) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a world-class chef and culinary writer for a luxury food magazine called "Aurae".
Given a recipe title and category, generate the FULL recipe content.

Recipe title: "${title}"
Category: "${category}"

Return ONLY valid JSON (no markdown, no code blocks):
{
  "description": "2-3 sentence editorial magazine-quality description. Evocative, warm, sensory.",
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4,
  "difficulty": "Easy",
  "ingredients": ["ingredient 1 with measurement", "ingredient 2"],
  "instructions": [
    {"step": 1, "text": "Detailed instruction in editorial voice"},
    {"step": 2, "text": "Next step"}
  ]
}

Rules:
- difficulty must be "Easy", "Medium", or "Advanced"
- prep_time and cook_time in minutes
- 6-12 ingredients with precise measurements
- 4-7 instruction steps, richly written
- Return ONLY valid JSON`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  return JSON.parse(text);
}

function buildImageSeed(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return parseInt(hash.slice(0, 12), 16).toString();
}

function buildRecipeImagePrompt(title) {
  const cleanedTitle = String(title || '').replace(/\s+/g, ' ').trim();
  return [
    'Editorial food photography of',
    cleanedTitle,
    'served beautifully on a ceramic plate, natural window light, realistic textures, shallow depth of field, gourmet magazine styling, 3/4 camera angle, no text, no watermark'
  ].join(' ');
}

function buildSvgFallback(title) {
  const dishTitle = String(title || 'Aurae recipe').replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return entities[char];
  });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${dishTitle}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f5eadf"/>
          <stop offset="100%" stop-color="#d7b89e"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <circle cx="600" cy="450" r="250" fill="#fff8f1" opacity="0.95"/>
      <circle cx="600" cy="450" r="170" fill="#d98a5f" opacity="0.22"/>
      <path d="M450 435c55-60 115-90 150-90 53 0 83 28 147 103" fill="none" stroke="#7a3e24" stroke-width="18" stroke-linecap="round"/>
      <path d="M480 515c63 38 176 38 240 0" fill="none" stroke="#7a3e24" stroke-width="18" stroke-linecap="round"/>
      <text x="600" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#5c3a29">${dishTitle}</text>
      <text x="600" y="815" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" letter-spacing="4" fill="#7a5a47">AURAE</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function generateRecipeImage(title) {
  const cleanedTitle = String(title || '').replace(/\s+/g, ' ').trim();

  if (!cleanedTitle) {
    return buildSvgFallback('Aurae recipe');
  }

  const prompt = buildRecipeImagePrompt(cleanedTitle);
  const seed = buildImageSeed(cleanedTitle.toLowerCase());
  const encodedPrompt = encodeURIComponent(prompt);

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=900&model=flux&nologo=true&seed=${seed}`;
}

module.exports = { generateRecipeContent, generateRecipeImage };
