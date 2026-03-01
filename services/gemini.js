const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyCjJTkC18-rLefSB2k23C99zoI5gONj5A8';
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
  const prompt = `Professional food photography of "${title}". Top-down shot on a rustic wooden table with natural soft lighting, styled like a luxury food magazine editorial. Warm tones, shallow depth of field, garnished beautifully. No text, no watermarks.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '4:3' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Imagen API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (!data.predictions || data.predictions.length === 0) {
    throw new Error('No image generated');
  }

  const base64 = data.predictions[0].bytesBase64Encoded;
  const mimeType = data.predictions[0].mimeType || 'image/png';
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';

  // Save to public/uploads/
  const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

  return `/uploads/${filename}`;
}

module.exports = { generateRecipeContent, generateRecipeImage };
