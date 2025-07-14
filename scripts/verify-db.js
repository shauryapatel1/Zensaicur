// Database verification script
// Run with: node scripts/verify-db.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  console.log('🔍 Verifying database setup...');
  
  try {
    // Check tables
    const tables = [
      'profiles',
      'journal_entries',
      'badges',
      'user_badges',
      'stripe_customers',
      'stripe_subscriptions',
      'stripe_products',
      'stripe_prices',
      'stripe_orders',
      'stripe_webhooks'
    ];
    
    console.log('\n📋 Checking tables...');
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Table '${table}' check failed:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists with ${count} rows`);
      }
    }
    
    // Check functions
    console.log('\n🔧 Checking functions...');
    const functions = [
      'get_user_badge_progress',
      'update_user_subscription',
      'create_profile_for_new_user',
      'update_streak_on_new_entry',
      'update_streak_badges',
      'update_entry_count_badges',
      'handle_stripe_subscription_updated',
      'handle_stripe_checkout_completed',
      'process_stripe_webhook'
    ];
    
    const { data: functionList, error: functionError } = await supabase.rpc('get_functions');
    
    if (functionError) {
      console.error('❌ Could not retrieve functions:', functionError.message);
    } else {
      const functionNames = functionList.map(f => f.name);
      for (const func of functions) {
        if (functionNames.includes(func)) {
          console.log(`✅ Function '${func}' exists`);
        } else {
          console.error(`❌ Function '${func}' not found`);
        }
      }
    }
    
    // Check storage buckets
    console.log('\n📦 Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Could not retrieve storage buckets:', bucketsError.message);
    } else {
      const bucketNames = buckets.map(b => b.name);
      for (const bucket of ['journal-photos', 'affirmation-audio']) {
        if (bucketNames.includes(bucket)) {
          console.log(`✅ Bucket '${bucket}' exists`);
        } else {
          console.error(`❌ Bucket '${bucket}' not found`);
        }
      }
    }
    
    // Check RLS policies
    console.log('\n🔒 Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies');
    
    if (policiesError) {
      console.error('❌ Could not retrieve RLS policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policies.length} RLS policies`);
      
      // Check if each table has at least one policy
      const tablesWithPolicies = [...new Set(policies.map(p => p.table))];
      for (const table of tables) {
        if (tablesWithPolicies.includes(table)) {
          console.log(`✅ Table '${table}' has RLS policies`);
        } else {
          console.error(`❌ Table '${table}' has no RLS policies`);
        }
      }
    }
    
    console.log('\n✨ Database verification complete!');
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
  }
}

// Helper RPC function to get all functions
supabase.rpc = async function(name, params = {}) {
  if (name === 'get_functions') {
    const { data, error } = await supabase.from('pg_catalog.pg_proc')
      .select('proname as name')
      .contains('pronamespace', { nspname: 'public' });
    return { data, error };
  } else if (name === 'get_policies') {
    const { data, error } = await supabase.from('pg_catalog.pg_policy')
      .select('polname as name, relname as table')
      .contains('polnamespace', { nspname: 'public' });
    return { data, error };
  } else {
    return await supabase.functions.invoke(name, { body: params });
  }
};

// Run the verification
verifyDatabase().catch(console.error);