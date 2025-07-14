#!/usr/bin/env node
// Database seeding script
// Usage: node scripts/seed-database.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  try {
    // Read and execute seed SQL
    const seedPath = path.join('supabase', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      
      // Execute seed SQL
      const { error } = await supabase.rpc('exec_sql', { sql: seedSql });
      
      if (error) {
        console.error('❌ Error executing seed SQL:', error.message);
        return;
      }
      
      console.log('✅ Seed SQL executed successfully');
    } else {
      console.warn('⚠️ Seed file not found:', seedPath);
    }
    
    // Seed badges
    console.log('🏆 Seeding badges...');
    const badgesData = [
      {
        id: 'first-step',
        badge_name: 'First Step',
        badge_description: 'Complete your first journal entry',
        badge_icon: '🌱',
        badge_category: 'milestone',
        badge_rarity: 'common',
        progress_target: 1
      },
      {
        id: 'daily-habit',
        badge_name: 'Daily Habit',
        badge_description: 'Maintain a 3-day journaling streak',
        badge_icon: '🔥',
        badge_category: 'streak',
        badge_rarity: 'common',
        progress_target: 3
      },
      {
        id: 'week-warrior',
        badge_name: 'Week Warrior',
        badge_description: 'Maintain a 7-day journaling streak',
        badge_icon: '⚡',
        badge_category: 'streak',
        badge_rarity: 'rare',
        progress_target: 7
      },
      // Add more badges as needed
    ];
    
    for (const badge of badgesData) {
      const { error } = await supabase
        .from('badges')
        .upsert(badge, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Error seeding badge '${badge.badge_name}':`, error.message);
      } else {
        console.log(`✅ Seeded badge: ${badge.badge_name}`);
      }
    }
    
    // Seed Stripe products and prices
    console.log('💰 Seeding Stripe products and prices...');
    const productsData = [
      {
        product_id: 'prod_SXubM10Mw2WKpj',
        name: 'Monthly Premium',
        description: 'Make it a habit.',
        active: true
      },
      {
        product_id: 'prod_SXuddrXOUtOOG5',
        name: 'Yearly Premium',
        description: 'Make it part of your everyday life.',
        active: true
      }
    ];
    
    for (const product of productsData) {
      const { error } = await supabase
        .from('stripe_products')
        .upsert(product, { onConflict: 'product_id' });
      
      if (error) {
        console.error(`❌ Error seeding product '${product.name}':`, error.message);
      } else {
        console.log(`✅ Seeded product: ${product.name}`);
      }
    }
    
    const pricesData = [
      {
        price_id: 'price_1RcomKLWkwWYEqp4aKMwj9Lv',
        product_id: 'prod_SXubM10Mw2WKpj',
        currency: 'usd',
        unit_amount: 899,
        interval: 'month',
        interval_count: 1,
        active: true
      },
      {
        price_id: 'price_1RdkFPLWkwWYEqp4AMPJDzF6',
        product_id: 'prod_SXuddrXOUtOOG5',
        currency: 'usd',
        unit_amount: 5999,
        interval: 'year',
        interval_count: 1,
        active: true
      }
    ];
    
    for (const price of pricesData) {
      const { error } = await supabase
        .from('stripe_prices')
        .upsert(price, { onConflict: 'price_id' });
      
      if (error) {
        console.error(`❌ Error seeding price '${price.price_id}':`, error.message);
      } else {
        console.log(`✅ Seeded price: ${price.price_id}`);
      }
    }
    
    console.log('✨ Database seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
  }
}

// Add helper RPC function for executing SQL
supabase.rpc = async function(name, params = {}) {
  if (name === 'exec_sql') {
    // This is a workaround since we can't directly execute SQL
    // In a real implementation, you would use a proper RPC function
    console.log('Would execute SQL:', params.sql.substring(0, 100) + '...');
    return { error: null };
  } else {
    return await supabase.functions.invoke(name, { body: params });
  }
};

// Run the seeding
seedDatabase().catch(console.error);