#!/usr/bin/env node
// Database restore script
// Usage: node scripts/restore-database.js backup_file.sql

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

// Get backup file from command line arguments
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Please provide a backup file to restore');
  console.error('Usage: node scripts/restore-database.js backup_file.sql');
  
  // List available backups
  const backupsDir = path.join('supabase', 'backups');
  if (fs.existsSync(backupsDir)) {
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 0) {
      console.log('\n📋 Available backups:');
      backupFiles.forEach(file => {
        const stats = fs.statSync(path.join(backupsDir, file));
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  - ${file} (${fileSizeInMB} MB)`);
      });
    }
  }
  
  process.exit(1);
}

// Resolve backup file path
let backupFilePath = backupFile;
if (!path.isAbsolute(backupFilePath)) {
  // Check if file exists in current directory
  if (fs.existsSync(backupFilePath)) {
    backupFilePath = path.resolve(backupFilePath);
  } else {
    // Check if file exists in backups directory
    const backupsDir = path.join('supabase', 'backups');
    const backupInDir = path.join(backupsDir, backupFilePath);
    if (fs.existsSync(backupInDir)) {
      backupFilePath = backupInDir;
    } else {
      console.error(`❌ Backup file not found: ${backupFilePath}`);
      process.exit(1);
    }
  }
}

console.log(`🔍 Restoring database from backup: ${backupFilePath}`);

// Confirm restoration
console.log('\n⚠️  WARNING: This will overwrite your current database!');
console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

// Wait for 5 seconds before proceeding
setTimeout(() => {
  try {
    // Use Supabase db restore to restore backup
    execSync(`supabase db restore --file ${backupFilePath}`, { stdio: 'inherit' });
    console.log('✅ Database restored successfully');
  } catch (error) {
    console.error('❌ Error restoring database:', error.message);
    process.exit(1);
  }
}, 5000);