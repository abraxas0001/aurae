const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
  }

  // Verify user still exists in DB (handles stale sessions after re-seed)
  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.user.id);
  if (!userExists) {
    req.session.destroy(() => {
      res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    });
    return;
  }

  next();
}

module.exports = { requireAuth };
