const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.get('/', async (req, res) => {
  try {
    // Featured recipes (3 most recent)
    const featuredResult = await pool.query(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 3
    `);

    // All categories with recipe counts
    const categoriesResult = await pool.query(`
      SELECT c.*, COUNT(r.id) as recipe_count
      FROM categories c
      LEFT JOIN recipes r ON r.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);

    // Total recipe count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM recipes');
    const recipeCount = parseInt(countResult.rows[0].count);

    res.render('index', {
      title: 'Aurae | A Culinary Journal',
      featured: featuredResult.rows,
      categories: categoriesResult.rows,
      recipeCount
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.status(500).send('Error loading page');
  }
});

module.exports = router;
