const cron = require('node-cron');
const { generateDailyRecipes } = require('./recipe-generator');

let isRunning = false;

async function runGeneration() {
  if (isRunning) {
    console.log('[Scheduler] Generation already in progress, skipping.');
    return;
  }
  isRunning = true;
  const start = Date.now();
  console.log('[Scheduler] ── Daily recipe generation started ──');

  try {
    const titles = await generateDailyRecipes();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('[Scheduler] ── Done in %ss. Published: %s ──', elapsed, titles.join(' | ') || 'none');
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err);
  } finally {
    isRunning = false;
  }
}

function initScheduler() {
  // Run at 06:00 AM every day
  cron.schedule('0 6 * * *', runGeneration, { timezone: 'UTC' });
  console.log('[Scheduler] Daily recipe generator active — runs every day at 06:00 UTC');
}

// Expose manual trigger for one-off runs (e.g. GET /admin/generate-now)
module.exports = { initScheduler, runGeneration };
