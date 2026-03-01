const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const bcrypt = require('bcrypt');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', {
    title: 'Sign In | Aurae',
    errors: [],
    old: {},
    redirect: req.query.redirect || ''
  });
});

// Login handler
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const redirect = req.query.redirect || '/';

  console.log('[LOGIN] Attempting login for:', username);

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      console.log('[LOGIN] User not found:', username);
      return res.render('auth/login', {
        title: 'Sign In | Aurae',
        errors: ['Invalid username or password.'],
        old: { username },
        redirect
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    console.log('[LOGIN] Password match:', passwordMatch);

    if (!passwordMatch) {
      return res.render('auth/login', {
        title: 'Sign In | Aurae',
        errors: ['Invalid username or password.'],
        old: { username },
        redirect
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name
    };

    console.log('[LOGIN] Session user set, regenerating session');
    
    // Regenerate session to ensure it's properly saved
    req.session.regenerate((err) => {
      if (err) {
        console.error('[LOGIN] Session regeneration error:', err);
      }
      
      req.session.user = {
        id: user.id,
        username: user.username,
        displayName: user.display_name
      };
      
      console.log('[LOGIN] Redirecting to:', redirect || '/');
      res.redirect(redirect || '/');
    });
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      title: 'Sign In | Aurae',
      errors: ['Something went wrong.'],
      old: { username },
      redirect
    });
  }
});

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/register', {
    title: 'Create Account | Aurae',
    errors: [],
    old: {}
  });
});

// Register handler
router.post('/register', async (req, res) => {
  const { display_name, username, email, password, password_confirm } = req.body;
  const errors = [];

  if (!display_name || display_name.trim().length < 2) errors.push('Display name must be at least 2 characters.');
  if (!username || username.trim().length < 3) errors.push('Username must be at least 3 characters.');
  if (!email || !email.includes('@')) errors.push('Please enter a valid email address.');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
  if (password !== password_confirm) errors.push('Passwords do not match.');

  // Check uniqueness
  if (errors.length === 0) {
    try {
      const existingUserRes = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
      if (existingUserRes.rows.length > 0) errors.push('Username is already taken.');

      const existingEmailRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
      if (existingEmailRes.rows.length > 0) errors.push('Email is already registered.');
    } catch (err) {
      console.error('Username/email check error:', err);
      errors.push('Something went wrong. Please try again.');
    }
  }

  if (errors.length > 0) {
    return res.render('auth/register', {
      title: 'Create Account | Aurae',
      errors,
      old: { display_name, username, email }
    });
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  try {
    const result = await pool.query(`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [username.trim(), email.trim(), passwordHash, display_name.trim()]);

    // Regenerate session for new user
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      
      req.session.user = {
        id: result.rows[0].id,
        username: username.trim(),
        displayName: display_name.trim()
      };
      
      res.redirect('/');
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.render('auth/register', {
      title: 'Create Account | Aurae',
      errors: ['Something went wrong. Please try again.'],
      old: { display_name, username, email }
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
