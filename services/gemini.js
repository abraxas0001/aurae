const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Debug: Log API key info (first 15 chars only for security)
console.log('[Gemini] API Key loaded:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'MISSING');

function buildFallbackRecipeContent(title, category) {
  const safeTitle = normalizeImageTitle(title) || 'Chef Special';
  const safeCategory = normalizeImageTitle(category) || 'Dinner';

  return {
    description: `${safeTitle} is a comforting ${safeCategory.toLowerCase()} recipe with layered flavors and simple, reliable technique for home cooks. This fallback version is generated locally when AI content is temporarily unavailable.`,
    prep_time: 20,
    cook_time: 35,
    servings: 4,
    difficulty: 'Medium',
    ingredients: [
      `500g ${safeTitle.toLowerCase().includes('chicken') ? 'chicken' : 'main protein or vegetables'}, cut into bite-sized pieces`,
      '2 tbsp neutral oil or ghee',
      '1 large onion, finely sliced',
      '2 tsp ginger-garlic paste',
      '2 medium tomatoes, chopped',
      '1 tsp ground cumin',
      '1 tsp ground coriander',
      '1/2 tsp turmeric',
      '1/2 tsp chili powder (adjust to taste)',
      'Salt, to taste',
      'Fresh herbs for garnish'
    ],
    instructions: [
      { step: 1, text: 'Heat oil in a heavy pan over medium heat. Add onion and cook until deeply golden and aromatic.' },
      { step: 2, text: 'Stir in ginger-garlic paste and cook briefly, then add tomatoes and spices. Cook until the masala thickens and oil begins to separate.' },
      { step: 3, text: 'Add the main ingredient and coat thoroughly in the masala. Cook for 3 to 4 minutes, stirring gently.' },
      { step: 4, text: 'Pour in a splash of water, cover, and simmer until tender and well-seasoned. Adjust salt and spice to taste.' },
      { step: 5, text: 'Finish with fresh herbs and rest for 2 minutes before serving. Pair with rice, flatbread, or a crisp salad.' }
    ]
  };
}

function extractRecipeJsonObject(rawText) {
  if (!rawText) {
    throw new Error('Empty AI response');
  }

  let cleaned = String(rawText).trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  const directParse = (() => {
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  })();

  if (directParse) {
    return directParse;
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

function normalizeRecipeContent(data, title, category) {
  const fallback = buildFallbackRecipeContent(title, category);

  return {
    description: typeof data?.description === 'string' && data.description.trim() ? data.description : fallback.description,
    prep_time: Number.isFinite(Number(data?.prep_time)) ? Number(data.prep_time) : fallback.prep_time,
    cook_time: Number.isFinite(Number(data?.cook_time)) ? Number(data.cook_time) : fallback.cook_time,
    servings: Number.isFinite(Number(data?.servings)) ? Number(data.servings) : fallback.servings,
    difficulty: ['Easy', 'Medium', 'Advanced'].includes(data?.difficulty) ? data.difficulty : fallback.difficulty,
    ingredients: Array.isArray(data?.ingredients) && data.ingredients.length > 0 ? data.ingredients : fallback.ingredients,
    instructions: Array.isArray(data?.instructions) && data.instructions.length > 0 ? data.instructions : fallback.instructions
  };
}

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

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractRecipeJsonObject(text);
    return normalizeRecipeContent(parsed, title, category);
  } catch (err) {
    console.error('Recipe content generation fallback:', err.message);
    return buildFallbackRecipeContent(title, category);
  }
}

function buildImageSeed(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return parseInt(hash.slice(0, 12), 16).toString();
}

function toSafeIntSeed(seedInput, fallbackTitle) {
  const maxInt32 = 2147483646;
  const baseSeed = seedInput || buildImageSeed(String(fallbackTitle || 'aurae-image'));
  const numeric = Number.parseInt(String(baseSeed), 10);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return 1337;
  }

  const normalized = Math.abs(numeric % maxInt32);
  return normalized === 0 ? 1337 : normalized;
}

function normalizeImageTitle(title) {
  return String(title || '').replace(/\s+/g, ' ').trim();
}

function buildRecipeImagePrompt(title) {
  const cleanedTitle = normalizeImageTitle(title);
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
  const cleanedTitle = normalizeImageTitle(title);

  if (!cleanedTitle) {
    return buildSvgFallback('Aurae recipe');
  }

  const seed = buildImageSeed(cleanedTitle.toLowerCase());

  return `/ai/image?title=${encodeURIComponent(cleanedTitle)}&seed=${seed}`;
}

function buildStockPhotoUrl(title, seed) {
  const cleanedTitle = normalizeImageTitle(title);
  const titleLower = cleanedTitle.toLowerCase();

  // Food-only fallback image ids to avoid unrelated random photos.
  const keywordImageMap = {
    mutton: 'photo-1544025162-d76694265947',
    lamb: 'photo-1544025162-d76694265947',
    goat: 'photo-1544025162-d76694265947',
    chicken: 'photo-1598103442097-8b74394b95c6',
    beef: 'photo-1558030006-450675393462',
    steak: 'photo-1546833999-b9f581a1996d',
    curry: 'photo-1585937421612-70a008356fbe',
    biryani: 'photo-1563379091339-03246963d51a',
    kebab: 'photo-1529193591184-b1d58069ecdd',
    pasta: 'photo-1621996346565-e3dbc646d9a9',
    pizza: 'photo-1513104890138-7c749659a591',
    ramen: 'photo-1569718212165-3a8278d5f624',
    sushi: 'photo-1579871494447-9811cf80d66c',
    fish: 'photo-1519708227418-c8fd9a32b7a2',
    salmon: 'photo-1467003909585-2f8a72700288',
    salad: 'photo-1512621776951-a57141f2eefd',
    dessert: 'photo-1488477181946-6428a0291777',
    cake: 'photo-1578985545062-69928b1d9587',
    lassi: 'photo-1604908554027-3ce3f4f5f7f2'
  };

  for (const [keyword, imageId] of Object.entries(keywordImageMap)) {
    if (titleLower.includes(keyword)) {
      return `https://images.unsplash.com/${imageId}?w=1200&q=80&fit=crop`;
    }
  }

  const fallbackImageIds = [
    'photo-1540189549336-e6e99c3679fe',
    'photo-1504674900247-0877df9cc836',
    'photo-1498837167922-ddd27525d352',
    'photo-1521305916504-4a1121188589',
    'photo-1546069901-ba9599a7e63c'
  ];

  const resolvedSeed = toSafeIntSeed(seed, titleLower);
  const fallbackIndex = resolvedSeed % fallbackImageIds.length;
  const fallbackId = fallbackImageIds[fallbackIndex];

  return `https://images.unsplash.com/${fallbackId}?w=1200&q=80&fit=crop`;
}

async function generateNanoBananaImage(title, seed) {
  const cleanedTitle = normalizeImageTitle(title);

  if (!cleanedTitle) {
    throw new Error('Image title is required for Nano Banana');
  }

  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const resolvedSeed = toSafeIntSeed(seed, cleanedTitle.toLowerCase());
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${buildRecipeImagePrompt(cleanedTitle)}. Keep composition appetizing and realistic.`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      seed: resolvedSeed
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = payload?.error?.message || `Nano Banana failed with ${response.status}`;
    throw new Error(errorMessage);
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData && part.inlineData.data);

  if (!imagePart) {
    throw new Error('Nano Banana returned no image payload');
  }

  return {
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    data: imagePart.inlineData.data
  };
}

module.exports = {
  buildSvgFallback,
  buildStockPhotoUrl,
  generateRecipeContent,
  generateNanoBananaImage,
  generateRecipeImage,
  normalizeImageTitle
};
