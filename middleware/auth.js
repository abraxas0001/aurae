const pool = require('../database/db');

async function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  // Verify user still exists in DB (handles stale sessions after re-seed)
  try {
    if (!pool) {
      // If database not available, just check session
      return next();
    }
    
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [req.session.user.id]);
    
    if (result.rows.length === 0) {
      req.session.destroy(() => {
        res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
      });
      return;
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    // On error, allow through but log it
    next();
  }
}

module.exports = { requireAuth };
