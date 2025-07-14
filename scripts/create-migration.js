#!/usr/bin/env node
// Migration helper script
// Usage: node scripts/create-migration.js "migration name"

import fs from 'fs';
import path from 'path';

// Get migration name from command line arguments
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Please provide a migration name');
  console.error('Usage: node scripts/create-migration.js "migration name"');
  process.exit(1);
}

// Create migration file name
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const fileName = `${timestamp}_${migrationName.toLowerCase().replace(/\s+/g, '_')}.sql`;
const filePath = path.join('supabase', 'migrations', fileName);

// Create migration file template
const template = `/*
  # ${migrationName}

  1. Changes
    - Describe the changes made by this migration
  
  2. Reason
    - Explain why these changes are necessary
*/

-- Your SQL statements here

`;

// Create migrations directory if it doesn't exist
const migrationsDir = path.join('supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Write migration file
fs.writeFileSync(filePath, template);

console.log(`Created migration file: ${filePath}`);