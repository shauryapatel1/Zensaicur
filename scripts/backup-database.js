#!/usr/bin/env node
// Database backup script
// Usage: node scripts/backup-database.js

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Supabase CLI is not installed. Please install it first:');
  console.error('npm install -g supabase');
  process.exit(1);
}

// Create backups directory if it doesn't exist
const backupsDir = path.join('supabase', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Create backup file name with timestamp
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const backupFileName = `backup_${timestamp}.sql`;
const backupFilePath = path.join(backupsDir, backupFileName);

console.log(`🔍 Creating database backup: ${backupFilePath}`);

try {
  // Use Supabase db dump to create backup
  execSync(`supabase db dump -f ${backupFilePath}`, { stdio: 'inherit' });
  console.log('✅ Backup created successfully');
  
  // List recent backups
  console.log('\n📋 Recent backups:');
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .reverse()
    .slice(0, 5);
  
  backupFiles.forEach(file => {
    const stats = fs.statSync(path.join(backupsDir, file));
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  - ${file} (${fileSizeInMB} MB)`);
  });
  
  console.log('\n✨ Database backup complete!');
} catch (error) {
  console.error('❌ Error creating backup:', error.message);
  process.exit(1);
}