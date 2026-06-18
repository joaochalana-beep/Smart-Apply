#!/usr/bin/env node
/**
 * Smart Apply — Import Scraped Jobs Script
 * ========================================
 * Run this after py combined_scraper.py to import jobs into your app.
 * 
 * Usage:
 *   node scripts/import-scraped-jobs.js
 *   node scripts/import-scraped-jobs.js --limit 100
 *   node scripts/import-scraped-jobs.js --file ./app_jobs.json
 */

const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1] || './app_jobs.json';
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '999999');

const filePath = path.resolve(fileArg);

console.log('Smart Apply — Import Scraped Jobs');
console.log('='.repeat(50));
console.log(`File: ${filePath}`);
console.log(`Limit: ${limitArg === 999999 ? 'unlimited' : limitArg}`);
console.log('='.repeat(50) + '\n');

// Read file
let jobs;
try {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  jobs = Array.isArray(parsed) ? parsed : parsed.app_jobs || parsed.jobs || [];
} catch (err) {
  console.error('Error reading file:', err.message);
  console.log('\nMake sure you ran: py combined_scraper.py');
  process.exit(1);
}

console.log(`Found ${jobs.length} scraped jobs`);
console.log(`\nBy source:`);
const bySource = {};
for (const job of jobs) {
  bySource[job.source] = (bySource[job.source] || 0) + 1;
}
for (const [source, count] of Object.entries(bySource)) {
  console.log(`  ${source}: ${count}`);
}

console.log(`\nBy region:`);
const byRegion = {};
for (const job of jobs) {
  byRegion[job.region] = (byRegion[job.region] || 0) + 1;
}
for (const [region, count] of Object.entries(byRegion)) {
  console.log(`  ${region}: ${count}`);
}

console.log(`\nTo import these jobs, run one of:`);
console.log(`  1. POST to /api/discover-companies (from your app UI)`);
console.log(`  2. Use curl:`);
console.log(`     curl -X POST http://localhost:3000/api/discover-companies`);
console.log(`       -H "Content-Type: application/json"`);
console.log(`       -H "Authorization: Bearer <your_clerk_token>"`);
console.log(`       -d '{"limit": ${Math.min(jobs.length, 100)}}'`);
console.log(`\n  3. Or import all at once:`);
console.log(`     curl -X POST http://localhost:3000/api/discover-companies`);
console.log(`       -H "Content-Type: application/json"`);
console.log(`       -H "Authorization: Bearer <your_clerk_token>"`);
