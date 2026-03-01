const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database/db');
const { generateRecipeImage } = require('./gemini');

const API_KEY = 'AIzaSyCjJTkC18-rLefSB2k23C99zoI5gONj5A8';
const genAI = new GoogleGenerativeAI(API_KEY);

// Unsplash fallback images by food style (keyed loosely)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3b28?w=600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
];

function getOrCreateAIUser() {
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get('ai@aurae.internal');
  if (!user) {
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).run('aurae_ai', 'ai@aurae.internal', 'SYSTEM_NO_LOGIN', 'Aurae Kitchen');
    user = { id: result.lastInsertRowid };
    console.log('[Generator] Created AI system user (id=%d)', user.id);
  }
  return user;
}

function getExistingCategories() {
  return db.prepare('SELECT id, name, slug FROM categories ORDER BY name').all();
}

function getOrCreateCategory(categoryData, existingCategories) {
  if (categoryData.action === 'existing') {
    const match = existingCategories.find(
      c => c.name.toLowerCase() === categoryData.name.toLowerCase()
    );
    if (match) return match.id;
    // AI hallucinated a name — fall back to first category
    return existingCategories[0].id;
  }

  // New category
  const slug = categoryData.slug ||
    categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const existing = db.prepare('SELECT id FROM categories WHERE slug = ? OR name = ?')
    .get(slug, categoryData.name);
  if (existing) return existing.id;

  const result = db.prepare(
    'INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)'
  ).run(
    categoryData.name,
    slug,
    categoryData.description || `Recipes for ${categoryData.name.toLowerCase()}.`,
    ''
  );

  console.log('[Generator] Created new category: "%s"', categoryData.name);
  return result.lastInsertRowid;
}

function buildUniqueSlug(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

async function generateRecipeData(recipeIndex, existingCategories) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const categoryList = existingCategories.map(c => `"${c.name}"`).join(', ');
  const date = new Date().toDateString();
  const cuisineHints = [
    'Italian, French, or Mediterranean',
    'Japanese, Korean, or Southeast Asian',
    'Mexican, Peruvian, or Latin American',
    'Middle Eastern, Moroccan, or Indian',
    'American comfort food or Southern cuisine',
    'Greek, Turkish, or Eastern European',
    'Chinese, Vietnamese, or Thai',
  ];
  const cuisineHint = cuisineHints[Math.floor(Math.random() * cuisineHints.length)];

  const prompt = `You are the executive chef and culinary director of Aurae, a luxury culinary journal.
Date: ${date}. This is recipe ${recipeIndex + 1} of 2 for today's daily batch.
Cuisine lean for this recipe: ${cuisineHint} (you can deviate if inspiration calls for it).

Existing categories: ${categoryList}

Generate ONE complete, original, publishable recipe. Choose a category from the existing list OR create a new one if the dish style genuinely warrants it (e.g., a new "Street Food" or "Raw & Vegan" category that doesn't exist yet).

Return ONLY valid JSON with no markdown, no code fences:
{
  "title": "Specific evocative recipe title",
  "description": "2-3 sentences. Sensory, editorial, warm in tone. At least 120 characters.",
  "prep_time": 20,
  "cook_time": 35,
  "servings": 4,
  "difficulty": "Easy",
  "category": {
    "action": "existing",
    "name": "Dinner",
    "slug": "dinner",
    "description": "Only required when action is new"
  },
  "ingredients": [
    "2 cups all-purpose flour",
    "1 tsp fine sea salt"
  ],
  "instructions": [
    { "step": 1, "text": "Detailed, richly written step." },
    { "step": 2, "text": "Continue..." }
  ]
}

Rules:
- difficulty: exactly "Easy", "Medium", or "Advanced"
- prep_time and cook_time: integers in minutes
- ingredients: 6-14 items, each with precise measurements
- instructions: 4-8 steps, each step written in editorial magazine voice (1-3 sentences)
- description must be at least 120 characters
- title must be specific — not just "Pasta" but something like "Saffron Tagliatelle with Crispy Pancetta"
- Return ONLY the JSON object, nothing else`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  // Strip markdown fences if the model ignores instructions
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in AI response');

  return JSON.parse(jsonMatch[0]);
}

async function generateAndSaveRecipe(authorId, recipeIndex) {
  // Always fetch fresh categories (in case a new one was just created by recipe 1)
  const existingCategories = getExistingCategories();

  console.log('[Generator] Asking Gemini for recipe %d...', recipeIndex + 1);
  const data = await generateRecipeData(recipeIndex, existingCategories);

  // Resolve category
  const categoryId = getOrCreateCategory(data.category, existingCategories);

  // Generate image (with fallback)
  let imageUrl = '';
  try {
    imageUrl = await generateRecipeImage(data.title);
    console.log('[Generator] Image generated for "%s"', data.title);
  } catch (err) {
    const fallback = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    imageUrl = fallback;
    console.warn('[Generator] Image failed (%s), using Unsplash fallback', err.message);
  }

  const slug = buildUniqueSlug(data.title);

  db.prepare(`
    INSERT INTO recipes
      (title, slug, description, image_url, prep_time, cook_time, servings,
       difficulty, category_id, author_id, ingredients, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.title,
    slug,
    data.description,
    imageUrl,
    data.prep_time  || 0,
    data.cook_time  || 0,
    data.servings   || 4,
    data.difficulty || 'Medium',
    categoryId,
    authorId,
    JSON.stringify(data.ingredients),
    JSON.stringify(data.instructions)
  );

  console.log('[Generator] Published: "%s" (category_id=%d)', data.title, categoryId);
  return data.title;
}

async function generateDailyRecipes() {
  const aiUser = getOrCreateAIUser();
  const titles = [];

  for (let i = 0; i < 2; i++) {
    try {
      const title = await generateAndSaveRecipe(aiUser.id, i);
      titles.push(title);
    } catch (err) {
      console.error('[Generator] Recipe %d failed: %s', i + 1, err.message);
    }
  }

  return titles;
}

module.exports = { generateDailyRecipes };
