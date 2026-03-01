require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const pool = require('./database/db');
const { initScheduler, runGeneration } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions - try to use pgSession if pool is available, fallback to memory store
const cookieConfig = {
  name: 'aurae.sid',
  secret: process.env.SESSION_SECRET || 'aurae-culinary-journal-2024-default',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  }
};

if (pool && process.env.DATABASE_URL) {
  cookieConfig.store = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: false
  });
  console.log('Using PostgreSQL session store');
} else {
  console.log('Warning: Using memory session store - sessions will not persist across deployments');
}

app.use(session(cookieConfig));

// Debug middleware to log session info
app.use((req, res, next) => {
  console.log('[DEBUG] Request to:', req.path, '| Session ID:', req.sessionID, '| Has user:', !!req.session.user);
  next();
});

// Make user and current path available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/recipes', require('./routes/recipes'));
app.use('/auth', require('./routes/auth'));
app.use('/favorites', require('./routes/favorites'));
app.use('/ai', require('./routes/ai'));
app.use('/chef', require('./routes/chef'));

// Admin: manually trigger daily recipe generation
app.post('/admin/generate-now', async (req, res) => {
  res.json({ status: 'started', message: 'Generation running in background — check server logs.' });
  runGeneration();
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`\n  Aurae is running at http://localhost:${PORT}\n`);
  if (process.env.DATABASE_URL) {
    initScheduler();
  }
});
