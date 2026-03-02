const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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

async function generateRecipeImage(title) {
  // Curated food photography from Unsplash based on dish type
  const imageMap = {
    // Breakfast & Brunch
    'pancake': 'photo-1528207776546-365bb710ee93',
    'waffle': 'photo-1562376552-0d160a2f238d',
    'eggs': 'photo-1525351484163-7529414344d8',
    'toast': 'photo-1525351484163-7529414344d8',
    'omelette': 'photo-1546942113-a6c43b63104a',
    
    // Pasta & Italian
    'pasta': 'photo-1621996346565-e3dbc646d9a9',
    'spaghetti': 'photo-1621996346565-e3dbc646d9a9',
    'ravioli': 'photo-1587748966451-c519e7e47345',
    'lasagna': 'photo-1619895092538-128341789043',
    'pizza': 'photo-1513104890138-7c749659a591',
    
    // Asian
    'sushi': 'photo-1579584425555-c3ce17fd4351',
    'ramen': 'photo-1569718212165-3a8278d5f624',
    'curry': 'photo-1588166524941-3bf61a9c41db',
    'stir fry': 'photo-1603133872878-684f208fb84b',
    'pad thai': 'photo-1559314809-0d155014e29e',
    
    // Meat dishes
    'steak': 'photo-1600891964092-4316c288032e',
    'chicken': 'photo-1598103442097-8b74394b95c6',
    'pork': 'photo-1529692236671-f1f6cf9683ba',
    'beef': 'photo-1588168333986-5078d3ae3976',
    
    // Salads & Vegetarian
    'salad': 'photo-1512621776951-a57141f2eefd',
    'bowl': 'photo-1546069901-ba9599a7e63c',
    'vegetable': 'photo-1540420773420-3366772f4999',
    
    // Desserts
    'cake': 'photo-1578985545062-69928b1d9587',
    'cookie': 'photo-1499636136210-6f4ee915583e',
    'brownie': 'photo-1607920591413-4ec007e70023',
    'ice cream': 'photo-1563805042-7684c019e1cb',
    'pie': 'photo-1464349095431-e9a21285b5f3',
    
    // Default
    'default': 'photo-1504674900247-0877df9cc836'
  };

  // Find matching image based on title keywords
  const titleLower = title.toLowerCase();
  let imageId = imageMap.default;

  for (const [keyword, id] of Object.entries(imageMap)) {
    if (titleLower.includes(keyword)) {
      imageId = id;
      break;
    }
  }

  // Return Unsplash URL with high quality
  return `https://images.unsplash.com/${imageId}?w=1200&q=80&fit=crop`;
}

module.exports = { generateRecipeContent, generateRecipeImage };
