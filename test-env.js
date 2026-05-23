// Quick test to verify .env loading
require('dotenv').config();

console.log('\n=== ENVIRONMENT VARIABLE TEST ===');
console.log('Current directory:', __dirname);
console.log('');

const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  console.log('✓ GEMINI_API_KEY is loaded');
  console.log('  First 15 characters:', apiKey.substring(0, 15) + '...');
  console.log('  Last 4 characters: ...' + apiKey.slice(-4));
  console.log('  Total length:', apiKey.length);
  
  // Check from your .env file
  const expectedStart = 'AIzaSyAlbEwy_FO';
  if (apiKey.startsWith(expectedStart)) {
    console.log('  ✓ Matches the key in .env file');
  } else {
    console.log('  ✗ Does NOT match the key in .env file');
    console.log('  Expected to start with:', expectedStart);
  }
} else {
  console.log('✗ GEMINI_API_KEY is NOT loaded');
  console.log('  .env file may not be loaded correctly');
}

console.log('\nAll environment variables with "GEMINI":');
Object.keys(process.env)
  .filter(key => key.includes('GEMINI'))
  .forEach(key => {
    console.log(`  ${key}: ${process.env[key].substring(0, 15)}...`);
  });

console.log('=================================\n');
