/*
  # Initial Schema Setup for Zensai

  1. New Tables
    - `profiles` - User profiles with journaling stats and subscription info
    - `journal_entries` - User journal entries with mood tracking and affirmations
    - `badges` - Available achievement badges
    - `user_badges` - Tracks which badges users have earned
    - `stripe_customers` - Maps users to Stripe customers
    - `stripe_subscriptions` - Tracks subscription status
    - `stripe_products` - Product catalog
    - `stripe_prices` - Price information for products
    - `stripe_orders` - One-time purchases
    - `stripe_user_orders` - Maps users to orders
    - `stripe_user_subscriptions` - Maps users to subscriptions
    - `stripe_webhooks` - Webhook event logs

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for anon access where needed

  3. Functions
    - Add helper functions for badge progress tracking
    - Add subscription management functions
*/

-- Create custom types
CREATE TYPE stripe_subscription_status AS ENUM (
  'not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
);

CREATE TYPE stripe_order_status AS ENUM (
  'pending', 'completed', 'canceled'
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  last_entry_date DATE,
  journaling_goal_frequency INT DEFAULT 3,
  total_badges_earned INT DEFAULT 0,
  subscription_status TEXT DEFAULT 'free',
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  revenuecart_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  mood TEXT NOT NULL,
  title TEXT,
  photo_url TEXT,
  photo_filename TEXT,
  affirmation_text TEXT,
  affirmation_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_category TEXT NOT NULL,
  badge_rarity TEXT NOT NULL,
  progress_target INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  progress_current INT DEFAULT 0,
  earned BOOLEAN DEFAULT false,
  earned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Create Stripe subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  price_id TEXT,
  status stripe_subscription_status DEFAULT 'not_started',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Stripe products table
CREATE TABLE IF NOT EXISTS stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id)
);

-- Create Stripe prices table
CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  unit_amount BIGINT NOT NULL,
  interval TEXT,
  interval_count INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(price_id)
);

-- Create Stripe orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_id TEXT NOT NULL,
  amount_subtotal BIGINT,
  amount_total BIGINT,
  currency TEXT,
  payment_status TEXT,
  status stripe_order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(checkout_session_id)
);

-- Create Stripe user orders view
CREATE VIEW IF NOT EXISTS stripe_user_orders AS
  SELECT
    o.id,
    c.user_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.customer_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status,
    o.created_at,
    o.updated_at
  FROM stripe_orders o
  JOIN stripe_customers c ON o.customer_id = c.customer_id;

-- Create Stripe user subscriptions view
CREATE VIEW IF NOT EXISTS stripe_user_subscriptions AS
  SELECT
    s.id,
    c.user_id,
    s.customer_id,
    s.subscription_id,
    s.price_id,
    s.status AS subscription_status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4,
    s.created_at,
    s.updated_at
  FROM stripe_subscriptions s
  JOIN stripe_customers c ON s.customer_id = c.customer_id;

-- Create Stripe webhooks table
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles: Users can read and update their own profiles
CREATE POLICY "Users can read own profile" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Journal Entries: Users can CRUD their own entries
CREATE POLICY "Users can read own journal entries" 
  ON journal_entries FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journal entries" 
  ON journal_entries FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" 
  ON journal_entries FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" 
  ON journal_entries FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Badges: Everyone can read badges
CREATE POLICY "Anyone can read badges" 
  ON badges FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- User Badges: Users can read their own badges
CREATE POLICY "Users can read own badges" 
  ON user_badges FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Stripe Customers: Users can read their own customer info
CREATE POLICY "Users can read own customer info" 
  ON stripe_customers FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Stripe Products & Prices: Everyone can read products and prices
CREATE POLICY "Anyone can read products" 
  ON stripe_products FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Anyone can read prices" 
  ON stripe_prices FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Create function to get user badge progress
CREATE OR REPLACE FUNCTION get_user_badge_progress(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  badge_name TEXT,
  badge_description TEXT,
  badge_icon TEXT,
  badge_category TEXT,
  badge_rarity TEXT,
  earned BOOLEAN,
  earned_at TIMESTAMPTZ,
  progress_current INT,
  progress_target INT,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.badge_name,
    b.badge_description,
    b.badge_icon,
    b.badge_category,
    b.badge_rarity,
    COALESCE(ub.earned, false) AS earned,
    ub.earned_at,
    COALESCE(ub.progress_current, 0) AS progress_current,
    b.progress_target,
    CASE
      WHEN b.progress_target = 0 THEN 0
      ELSE ROUND((COALESCE(ub.progress_current, 0)::NUMERIC / b.progress_target::NUMERIC) * 100, 2)
    END AS progress_percentage
  FROM
    badges b
  LEFT JOIN
    user_badges ub ON b.id = ub.badge_id AND ub.user_id = target_user_id
  ORDER BY
    COALESCE(ub.earned, false) DESC,
    b.badge_rarity DESC,
    b.badge_category,
    b.badge_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user subscription
CREATE OR REPLACE FUNCTION update_user_subscription(
  user_id UUID,
  status TEXT,
  tier TEXT,
  expires_at TIMESTAMPTZ,
  revenuecart_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    subscription_status = status,
    subscription_tier = tier,
    subscription_expires_at = expires_at,
    revenuecart_user_id = revenuecart_id,
    updated_at = now()
  WHERE
    user_id = update_user_subscription.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streak on new journal entry
CREATE OR REPLACE FUNCTION update_streak_on_new_entry()
RETURNS TRIGGER AS $$
DECLARE
  last_entry_date DATE;
  current_streak INT;
  best_streak INT;
BEGIN
  -- Get user's profile data
  SELECT p.last_entry_date, p.current_streak, p.best_streak
  INTO last_entry_date, current_streak, best_streak
  FROM profiles p
  WHERE p.user_id = NEW.user_id;
  
  -- Calculate streak
  IF last_entry_date IS NULL THEN
    -- First entry ever
    current_streak := 1;
  ELSIF last_entry_date = CURRENT_DATE THEN
    -- Already journaled today, no streak change
    current_streak := current_streak;
  ELSIF last_entry_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    current_streak := current_streak + 1;
  ELSE
    -- Streak broken, start new streak
    current_streak := 1;
  END IF;
  
  -- Update best streak if needed
  IF current_streak > best_streak THEN
    best_streak := current_streak;
  END IF;
  
  -- Update profile
  UPDATE profiles
  SET
    last_entry_date = CURRENT_DATE,
    current_streak = current_streak,
    best_streak = best_streak,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Check for streak badges
  PERFORM update_streak_badges(NEW.user_id, current_streak);
  
  -- Check for entry count badges
  PERFORM update_entry_count_badges(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update streak badges
CREATE OR REPLACE FUNCTION update_streak_badges(user_id UUID, current_streak INT)
RETURNS VOID AS $$
DECLARE
  badge_record RECORD;
BEGIN
  -- Get all streak badges
  FOR badge_record IN
    SELECT id, progress_target
    FROM badges
    WHERE badge_category = 'streak'
    ORDER BY progress_target
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges
      WHERE user_id = update_streak_badges.user_id
      AND badge_id = badge_record.id
    ) THEN
      -- Create badge progress record
      INSERT INTO user_badges (
        user_id, badge_id, progress_current, earned, earned_at
      )
      VALUES (
        update_streak_badges.user_id,
        badge_record.id,
        current_streak,
        current_streak >= badge_record.progress_target,
        CASE WHEN current_streak >= badge_record.progress_target THEN NOW() ELSE NULL END
      );
    ELSE
      -- Update existing badge progress
      UPDATE user_badges
      SET
        progress_current = current_streak,
        earned = CASE
          WHEN earned THEN true  -- Keep earned badges
          ELSE current_streak >= badge_record.progress_target
        END,
        earned_at = CASE
          WHEN earned THEN earned_at  -- Keep original earned date
          WHEN current_streak >= badge_record.progress_target THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE
        user_id = update_streak_badges.user_id
        AND badge_id = badge_record.id;
    END IF;
  END LOOP;
  
  -- Update total badges earned
  UPDATE profiles
  SET
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_id = update_streak_badges.user_id
      AND earned = true
    ),
    updated_at = NOW()
  WHERE user_id = update_streak_badges.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update entry count badges
CREATE OR REPLACE FUNCTION update_entry_count_badges(user_id UUID)
RETURNS VOID AS $$
DECLARE
  badge_record RECORD;
  entry_count INT;
BEGIN
  -- Get total entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE user_id = update_entry_count_badges.user_id;
  
  -- Get all milestone badges
  FOR badge_record IN
    SELECT id, progress_target
    FROM badges
    WHERE badge_category = 'milestone'
    ORDER BY progress_target
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges
      WHERE user_id = update_entry_count_badges.user_id
      AND badge_id = badge_record.id
    ) THEN
      -- Create badge progress record
      INSERT INTO user_badges (
        user_id, badge_id, progress_current, earned, earned_at
      )
      VALUES (
        update_entry_count_badges.user_id,
        badge_record.id,
        entry_count,
        entry_count >= badge_record.progress_target,
        CASE WHEN entry_count >= badge_record.progress_target THEN NOW() ELSE NULL END
      );
    ELSE
      -- Update existing badge progress
      UPDATE user_badges
      SET
        progress_current = entry_count,
        earned = CASE
          WHEN earned THEN true  -- Keep earned badges
          ELSE entry_count >= badge_record.progress_target
        END,
        earned_at = CASE
          WHEN earned THEN earned_at  -- Keep original earned date
          WHEN entry_count >= badge_record.progress_target THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE
        user_id = update_entry_count_badges.user_id
        AND badge_id = badge_record.id;
    END IF;
  END LOOP;
  
  -- Update total badges earned
  UPDATE profiles
  SET
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_id = update_entry_count_badges.user_id
      AND earned = true
    ),
    updated_at = NOW()
  WHERE user_id = update_entry_count_badges.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

CREATE TRIGGER on_journal_entry_created
  AFTER INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_new_entry();

-- Insert initial badges
INSERT INTO badges (badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target) VALUES
-- Streak badges
('First Step', 'Complete your first journal entry', '🌱', 'milestone', 'common', 1),
('Daily Habit', 'Maintain a 3-day journaling streak', '🔥', 'streak', 'common', 3),
('Week Warrior', 'Maintain a 7-day journaling streak', '⚡', 'streak', 'rare', 7),
('Fortnight Focus', 'Maintain a 14-day journaling streak', '🌟', 'streak', 'rare', 14),
('Monthly Master', 'Maintain a 30-day journaling streak', '🏆', 'streak', 'epic', 30),
('Quarterly Quest', 'Maintain a 90-day journaling streak', '👑', 'streak', 'legendary', 90),

-- Milestone badges
('Mindful Moments', 'Complete 5 journal entries', '🧠', 'milestone', 'common', 5),
('Reflection Routine', 'Complete 10 journal entries', '🔍', 'milestone', 'common', 10),
('Journaling Journey', 'Complete 25 journal entries', '📔', 'milestone', 'rare', 25),
('Diary Dedication', 'Complete 50 journal entries', '📚', 'milestone', 'rare', 50),
('Centurion', 'Complete 100 journal entries', '💯', 'milestone', 'epic', 100),
('Memoir Master', 'Complete 365 journal entries', '🌍', 'milestone', 'legendary', 365),

-- Achievement badges
('Mood Tracker', 'Track all five different moods in your journal', '🎭', 'achievement', 'rare', 5),
('Photo Memories', 'Add 5 photos to your journal entries', '📸', 'achievement', 'rare', 5),
('Night Owl', 'Journal after midnight 3 times', '🦉', 'achievement', 'rare', 3),
('Early Bird', 'Journal before 8am 3 times', '🐦', 'achievement', 'rare', 3),
('Premium Supporter', 'Subscribe to Zensai Premium', '✨', 'special', 'epic', 1),
('Founding Member', 'Join during the beta period', '🚀', 'special', 'legendary', 1);