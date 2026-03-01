const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { requireAuth } = require('../middleware/auth');

// Favorites page
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.render('favorites', {
        title: 'Your Collection | Aurae',
        recipes: [],
        error: 'Database connection unavailable. Please try again later.'
      });
    }
    const result = await pool.query(`
      SELECT r.*, c.name as category_name
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.session.user.id]);

    res.render('favorites', {
      title: 'Your Collection | Aurae',
      recipes: result.rows
    });
  } catch (err) {
    console.error('Favorites page error:', err);
    res.status(500).send('Error loading favorites');
  }
});

// Toggle favorite (AJAX)
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const { recipeId } = req.body;
    const userId = req.session.user.id;

    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required.' });
    }

    const existingResult = await pool.query('SELECT id FROM favorites WHERE user_id = $1 AND recipe_id = $2', [userId, recipeId]);

    if (existingResult.rows.length > 0) {
      await pool.query('DELETE FROM favorites WHERE id = $1', [existingResult.rows[0].id]);
      res.json({ favorited: false });
    } else {
      await pool.query('INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)', [userId, recipeId]);
      res.json({ favorited: true });
    }
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({error: 'Something went wrong' });
  }
});

module.exports = router;
