// Supabase connection helper script
// This script helps connect to Supabase and perform common operations

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with anonymous key (for user-level access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase admin client with service role key (for admin-level access)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Helper function to check if admin access is available
export function hasAdminAccess() {
  if (!supabaseAdmin) {
    console.warn('No admin access available. Some operations may fail.');
    return false;
  }
  return true;
}

// Helper function to get user profile
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
}

// Helper function to get user journal entries
export async function getUserJournalEntries(userId, limit = 10) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching journal entries:', error);
    return [];
  }
  
  return data;
}

// Helper function to get user badges
export async function getUserBadges(userId) {
  const { data, error } = await supabase
    .rpc('get_user_badge_progress', { target_user_id: userId });
  
  if (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
  
  return data;
}

// Helper function to create a signed URL for a file
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

// Example usage
if (require.main === module) {
  (async () => {
    console.log('Testing Supabase connection...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else if (session) {
      console.log('Connected to Supabase with user:', session.user.email);
      
      // Get user profile
      const profile = await getUserProfile(session.user.id);
      console.log('User profile:', profile);
      
      // Get user journal entries
      const entries = await getUserJournalEntries(session.user.id, 3);
      console.log('Recent journal entries:', entries);
      
      // Get user badges
      const badges = await getUserBadges(session.user.id);
      console.log('User badges:', badges);
    } else {
      console.log('Connected to Supabase (not authenticated)');
    }
  })();
}