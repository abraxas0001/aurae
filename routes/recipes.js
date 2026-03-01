const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { generateRecipeContent } = require('../services/gemini');

// Browse recipes
router.get('/', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).send('Database not available');
    }
    const { category, search, page = 1 } = req.query;
    const perPage = 9;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const offset = (currentPage - 1) * perPage;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereClause += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / perPage);

    // Get recipes
    const recipesQuery = `
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    const recipesResult = await pool.query(recipesQuery, [...params, perPage, offset]);
    const recipes = recipesResult.rows;

    // Get all categories for filter bar
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    // Active category name
    let activeCategory = null;
    if (category) {
      const cat = categories.find(c => c.slug === category);
      activeCategory = cat ? cat.name : null;
    }

    res.render('recipes/browse', {
      title: activeCategory ? `${activeCategory} Recipes | Aurae` : 'Recipes | Aurae',
      recipes,
      categories,
      category: category || null,
      activeCategory,
      search: search || '',
      currentPage,
      totalPages
    });
  } catch (err) {
    console.error('Browse recipes error:', err);
    res.status(500).send('Error loading recipes');
  }
});

// Create recipe form
router.get('/create', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.render('recipes/create', {
        title: 'Share Your Recipe | Aurae',
        categories: [],
        errors: ['Database connection unavailable. Please try again later.'],
        old: {}
      });
    }
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;
    res.render('recipes/create', {
      title: 'Share Your Recipe | Aurae',
      categories,
      errors: [],
      old: {}
    });
  } catch (err) {
    console.error('Create recipe page error:', err);
    res.status(500).send('Error loading page');
  }
});

// Create recipe handler
router.post('/create', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).send('Database not available');
    }
    const { title, description, image_url, category_id, prep_time, cook_time, servings, difficulty } = req.body;
    let ingredients = req.body.ingredients || req.body['ingredients[]'] || [];
    let instructions = req.body.instructions || req.body['instructions[]'] || [];

    // Normalize to arrays
    if (!Array.isArray(ingredients)) ingredients = ingredients ? [ingredients] : [];
    if (!Array.isArray(instructions)) instructions = instructions ? [instructions] : [];

    // Filter empty entries
    ingredients = ingredients.filter(i => i.trim() !== '');
    instructions = instructions.filter(i => i.trim() !== '');

    const errors = [];

    if (!title || title.trim().length < 2) errors.push('Title must be at least 2 characters.');
    if (!description || description.trim().length < 10) errors.push('Description must be at least 10 characters.');
    if (!category_id) errors.push('Please select a category.');
    if (ingredients.length === 0) errors.push('Add at least one ingredient.');
    if (instructions.length === 0) errors.push('Add at least one instruction step.');

    if (errors.length > 0) {
      const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
      const categories = categoriesResult.rows;
      return res.render('recipes/create', {
        title: 'Share Your Recipe | Aurae',
        categories,
        errors,
        old: req.body
      });
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 6);

    // Format instructions as step objects
    const formattedInstructions = instructions.map((text, idx) => ({
      step: idx + 1,
      text: text.trim()
    }));

    await pool.query(`
      INSERT INTO recipes (title, slug, description, image_url, prep_time, cook_time, servings, difficulty, category_id, author_id, ingredients, instructions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      title.trim(),
      slug,
      description.trim(),
      image_url || '',
      parseInt(prep_time) || 0,
      parseInt(cook_time) || 0,
      parseInt(servings) || 1,
      difficulty || 'Easy',
      parseInt(category_id),
      req.session.user.id,
      JSON.stringify(ingredients.map(i => i.trim())),
      JSON.stringify(formattedInstructions)
    ]);

    res.redirect(`/recipes/${slug}`);
  } catch (err) {
    console.error('Recipe create error:', err);
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    let errorMsg = 'Something went wrong. Please try again.';
    if (err.message && err.message.includes('duplicate key')) {
      errorMsg = 'A recipe with a similar name already exists. Try a slightly different title.';
    }

    res.render('recipes/create', {
      title: 'Share Your Recipe | Aurae',
      categories,
      errors: [errorMsg],
      old: req.body
    });
  }
});

// Recipe detail
router.get('/:slug', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).send('Database not available');
    }
    const recipeResult = await pool.query(`
      SELECT r.*, c.name as category_name, u.display_name as author_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.slug = $1
    `, [req.params.slug]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).render('404', { title: 'Recipe Not Found' });
    }

    const recipe = recipeResult.rows[0];

    // Check if recipe has missing or empty content
    let needsAI = false;
    try {
      const ing = JSON.parse(recipe.ingredients);
      const ins = JSON.parse(recipe.instructions);
      if (!ing || ing.length === 0 || !ins || ins.length === 0) {
        needsAI = true;
      }
    } catch {
      needsAI = true;
    }

    // Use Gemini to generate missing content and save it
    if (needsAI) {
      try {
        const aiData = await generateRecipeContent(recipe.title, recipe.category_name || 'dinner');
        recipe.description = aiData.description || recipe.description;
        recipe.prep_time = aiData.prep_time || recipe.prep_time;
        recipe.cook_time = aiData.cook_time || recipe.cook_time;
        recipe.servings = aiData.servings || recipe.servings;
        recipe.difficulty = aiData.difficulty || recipe.difficulty;
        recipe.ingredients = JSON.stringify(aiData.ingredients || []);
        recipe.instructions = JSON.stringify(aiData.instructions || []);

        // Save back to database so we don't call AI again
        await pool.query(`
          UPDATE recipes SET description = $1, prep_time = $2, cook_time = $3, servings = $4, difficulty = $5, ingredients = $6, instructions = $7, updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [recipe.description, recipe.prep_time, recipe.cook_time, recipe.servings, recipe.difficulty, recipe.ingredients, recipe.instructions, recipe.id]);
      } catch (err) {
        console.error('AI fallback failed:', err.message);
      }
    }

    // Check if favorited
    let isFavorited = false;
    if (req.session.user) {
      const favResult = await pool.query('SELECT id FROM favorites WHERE user_id = $1 AND recipe_id = $2', [req.session.user.id, recipe.id]);
      isFavorited = favResult.rows.length > 0;
    }

    // Related recipes (same category, exclude current)
    const relatedResult = await pool.query(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = $1 AND r.id != $2
      ORDER BY RANDOM()
      LIMIT 3
    `, [recipe.category_id, recipe.id]);
    const related = relatedResult.rows;

    res.render('recipes/detail', {
      title: `${recipe.title} | Aurae`,
      recipe,
      isFavorited,
      related
    });
  } catch (err) {
    console.error('Recipe detail error:', err);
    res.status(500).send('Error loading recipe');
  }
});

module.exports = router;
