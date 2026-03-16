require('dotenv').config();
const { Pool } = require('pg');

// Create a pool of connections only if DATABASE_URL is set
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Initialize database schema
async function initializeDatabase() {
  if (!pool) {
    console.log('Database not configured - skipping schema initialization');
    return;
  }
  try {
    // Create extensions if needed
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500)
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty VARCHAR(50) CHECK(difficulty IN ('Easy','Medium','Advanced')),
        category_id INTEGER REFERENCES categories(id),
        author_id INTEGER REFERENCES users(id),
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        recipe_id INTEGER NOT NULL REFERENCES recipes(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id)
      );

      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        PRIMARY KEY (sid)
      );

      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize on startup
if (process.env.DATABASE_URL) {
  initializeDatabase();
} else {
  console.log('Warning: DATABASE_URL not set - database features will be unavailable');
}

module.exports = pool;
