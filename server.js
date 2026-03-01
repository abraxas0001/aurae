require('dotenv').config({ path: '.env.local' });
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

// Sessions
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'aurae-culinary-journal-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

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
  initScheduler();
});
