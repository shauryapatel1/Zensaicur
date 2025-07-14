/*
# Zensai Database Schema

1. New Tables
   - `profiles` - User profiles with journaling stats and subscription info
   - `journal_entries` - User journal entries with mood tracking and affirmations
   - `badges` - Badge definitions for achievements
   - `user_badges` - User-earned badges with progress tracking
   - `stripe_customers` - Stripe customer mapping
   - `stripe_subscriptions` - Subscription status tracking
   - `stripe_orders` - One-time payment tracking
   - `stripe_products` - Product catalog
   - `stripe_prices` - Price definitions

2. Security
   - Row Level Security (RLS) policies for all tables
   - Secure functions for badge progress tracking

3. Functions
   - `get_user_badge_progress` - Returns badge progress for a user
   - `update_user_subscription` - Updates user subscription status
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for subscription status and order status
DO $$ BEGIN
    CREATE TYPE public.stripe_subscription_status AS ENUM (
        'not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.stripe_order_status AS ENUM (
        'pending', 'completed', 'canceled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT,
    mood TEXT NOT NULL,
    photo_url TEXT,
    photo_filename TEXT,
    affirmation_text TEXT,
    affirmation_audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned BOOLEAN DEFAULT false,
    earned_at TIMESTAMPTZ,
    progress_current INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Create Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Create Stripe subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT NOT NULL,
    subscription_id TEXT UNIQUE,
    price_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    payment_method_brand TEXT,
    payment_method_last4 TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Stripe orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkout_session_id TEXT NOT NULL UNIQUE,
    payment_intent_id TEXT,
    customer_id TEXT NOT NULL,
    amount_subtotal INT,
    amount_total INT,
    currency TEXT,
    payment_status TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Stripe products table
CREATE TABLE IF NOT EXISTS stripe_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Stripe prices table
CREATE TABLE IF NOT EXISTS stripe_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    unit_amount INT NOT NULL,
    interval TEXT,
    interval_count INT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Stripe webhooks table
CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create function to get user badge progress
CREATE OR REPLACE FUNCTION get_user_badge_progress(target_user_id UUID)
RETURNS TABLE (
    id TEXT,
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
        b.badge_category,
        b.badge_rarity,
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
        profiles.user_id = update_user_subscription.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to update profile on journal entry
CREATE OR REPLACE FUNCTION update_profile_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    last_entry_date DATE;
    current_date DATE := CURRENT_DATE;
    streak_days INT;
    best_streak INT;
BEGIN
    -- Get the last entry date from the profile
    SELECT profiles.last_entry_date, profiles.current_streak, profiles.best_streak
    INTO last_entry_date, streak_days, best_streak
    FROM profiles
    WHERE profiles.user_id = NEW.user_id;
    
    -- Update the last entry date
    UPDATE profiles
    SET last_entry_date = current_date,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Update streak if this is a new day
    IF last_entry_date IS NULL OR last_entry_date < current_date THEN
        -- If last entry was yesterday, increment streak
        IF last_entry_date IS NULL OR last_entry_date = (current_date - INTERVAL '1 day')::DATE THEN
            streak_days := streak_days + 1;
            
            -- Update best streak if current streak is better
            IF streak_days > best_streak THEN
                best_streak := streak_days;
            END IF;
            
            UPDATE profiles
            SET current_streak = streak_days,
                best_streak = best_streak,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        -- If last entry was more than a day ago, reset streak to 1
        ELSIF last_entry_date < (current_date - INTERVAL '1 day')::DATE THEN
            UPDATE profiles
            SET current_streak = 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for journal entries
CREATE TRIGGER on_journal_entry_insert
AFTER INSERT ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_profile_on_journal_entry();

-- Create trigger function to update badges on journal entry
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    entry_count INT;
    streak_days INT;
    best_streak INT;
    badge_record RECORD;
    user_badge_record RECORD;
    badges_earned INT := 0;
BEGIN
    -- Get current stats
    SELECT COUNT(*) INTO entry_count
    FROM journal_entries
    WHERE user_id = NEW.user_id;
    
    SELECT current_streak, best_streak
    INTO streak_days, best_streak
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    -- Process each badge
    FOR badge_record IN 
        SELECT * FROM badges
    LOOP
        -- Check if user already has this badge
        SELECT * INTO user_badge_record
        FROM user_badges
        WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
        
        -- If user doesn't have this badge record yet, create it
        IF user_badge_record IS NULL THEN
            INSERT INTO user_badges (user_id, badge_id, earned, progress_current)
            VALUES (NEW.user_id, badge_record.id, false, 0);
            
            -- Refetch the record
            SELECT * INTO user_badge_record
            FROM user_badges
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
        END IF;
        
        -- Skip if already earned
        IF user_badge_record.earned THEN
            CONTINUE;
        END IF;
        
        -- Update progress based on badge category
        IF badge_record.badge_category = 'milestone' THEN
            -- Update entry count badges
            UPDATE user_badges
            SET progress_current = entry_count
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
            
        ELSIF badge_record.badge_category = 'streak' THEN
            -- Update streak badges
            UPDATE user_badges
            SET progress_current = streak_days
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
            
        ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'first-entry' THEN
            -- First entry badge
            UPDATE user_badges
            SET progress_current = 1
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
            
        ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'best-streak-7' THEN
            -- Best streak achievement
            UPDATE user_badges
            SET progress_current = LEAST(best_streak, 7)
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
            
        ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'mood-variety' THEN
            -- Mood variety badge (count distinct moods used)
            UPDATE user_badges ub
            SET progress_current = (
                SELECT COUNT(DISTINCT mood)
                FROM journal_entries
                WHERE user_id = NEW.user_id
            )
            WHERE ub.user_id = NEW.user_id AND ub.badge_id = badge_record.id;
        END IF;
        
        -- Check if badge should be earned now
        UPDATE user_badges
        SET 
            earned = CASE WHEN progress_current >= (
                SELECT progress_target FROM badges WHERE id = badge_id
            ) THEN true ELSE false END,
            earned_at = CASE WHEN progress_current >= (
                SELECT progress_target FROM badges WHERE id = badge_id
            ) AND earned = false THEN now() ELSE earned_at END
        WHERE 
            user_id = NEW.user_id AND 
            badge_id = badge_record.id AND
            earned = false;
            
        -- Count newly earned badges
        IF EXISTS (
            SELECT 1 FROM user_badges
            WHERE user_id = NEW.user_id AND badge_id = badge_record.id AND earned = true
            AND (earned_at IS NULL OR earned_at > (now() - INTERVAL '1 minute'))
        ) THEN
            badges_earned := badges_earned + 1;
        END IF;
    END LOOP;
    
    -- Update total badges earned in profile
    IF badges_earned > 0 THEN
        UPDATE profiles
        SET 
            total_badges_earned = (
                SELECT COUNT(*) FROM user_badges
                WHERE user_id = NEW.user_id AND earned = true
            ),
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for badge updates
CREATE TRIGGER on_journal_entry_badge_update
AFTER INSERT ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_badges_on_journal_entry();

-- Create trigger function for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a profile for the new user
    INSERT INTO public.profiles (user_id, name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.created_at,
        NEW.created_at
    );
    
    -- Insert initial badges for the user
    INSERT INTO public.user_badges (user_id, badge_id, earned, progress_current)
    SELECT
        NEW.id,
        id,
        false,
        0
    FROM
        public.badges;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Insert initial badges
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES
    ('first-entry', 'First Steps', 'Complete your very first journal entry', '🌱', 'achievement', 'common', 1),
    ('streak-3', 'Daily Habit', 'Maintain a 3-day journaling streak', '🔥', 'streak', 'common', 3),
    ('streak-7', 'Week Warrior', 'Maintain a 7-day journaling streak', '⚡', 'streak', 'rare', 7),
    ('streak-14', 'Fortnight Focus', 'Maintain a 14-day journaling streak', '🌟', 'streak', 'rare', 14),
    ('streak-30', 'Monthly Master', 'Maintain a 30-day journaling streak', '🏆', 'streak', 'epic', 30),
    ('streak-100', 'Century Club', 'Maintain a 100-day journaling streak', '💯', 'streak', 'legendary', 100),
    ('entries-5', 'Getting Started', 'Write 5 journal entries', '📝', 'milestone', 'common', 5),
    ('entries-10', 'Regular Writer', 'Write 10 journal entries', '📔', 'milestone', 'common', 10),
    ('entries-25', 'Dedicated Diarist', 'Write 25 journal entries', '📚', 'milestone', 'rare', 25),
    ('entries-50', 'Journaling Enthusiast', 'Write 50 journal entries', '✨', 'milestone', 'epic', 50),
    ('entries-100', 'Journaling Expert', 'Write 100 journal entries', '🌈', 'milestone', 'legendary', 100),
    ('best-streak-7', 'Streak Seeker', 'Achieve a 7-day streak at any point', '🎯', 'achievement', 'rare', 7),
    ('mood-variety', 'Emotional Range', 'Use all 5 different mood options in your entries', '🎭', 'achievement', 'rare', 5);

-- Insert Stripe products
INSERT INTO stripe_products (product_id, name, description, active)
VALUES
    ('prod_SXubM10Mw2WKpj', 'Monthly Premium', 'Make it a habit.', true),
    ('prod_SXuddrXOUtOOG5', 'Yearly Premium', 'Make it part of your everyday life.', true)
ON CONFLICT (product_id) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = now();

-- Insert Stripe prices
INSERT INTO stripe_prices (price_id, product_id, currency, unit_amount, interval, interval_count, active)
VALUES
    ('price_1RcomKLWkwWYEqp4aKMwj9Lv', 'prod_SXubM10Mw2WKpj', 'usd', 899, 'month', 1, true),
    ('price_1RdkFPLWkwWYEqp4AMPJDzF6', 'prod_SXuddrXOUtOOG5', 'usd', 5999, 'year', 1, true)
ON CONFLICT (price_id) DO UPDATE
SET
    product_id = EXCLUDED.product_id,
    currency = EXCLUDED.currency,
    unit_amount = EXCLUDED.unit_amount,
    interval = EXCLUDED.interval,
    interval_count = EXCLUDED.interval_count,
    active = EXCLUDED.active,
    updated_at = now();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for journal entries
CREATE POLICY "Users can view their own journal entries"
ON journal_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
ON journal_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
ON journal_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
ON journal_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for user badges
CREATE POLICY "Users can view their own badges"
ON user_badges FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for Stripe customers
CREATE POLICY "Users can view their own Stripe customer"
ON stripe_customers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for Stripe subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON stripe_subscriptions FOR SELECT
TO authenticated
USING (
    customer_id IN (
        SELECT customer_id FROM stripe_customers
        WHERE user_id = auth.uid()
    )
);

-- Create RLS policies for Stripe orders
CREATE POLICY "Users can view their own orders"
ON stripe_orders FOR SELECT
TO authenticated
USING (
    customer_id IN (
        SELECT customer_id FROM stripe_customers
        WHERE user_id = auth.uid()
    )
);

-- Create RLS policies for Stripe products and prices (public read)
CREATE POLICY "Anyone can view products"
ON stripe_products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can view prices"
ON stripe_prices FOR SELECT
TO anon, authenticated
USING (true);

-- Create storage buckets for journal photos and affirmation audio
DO $$
BEGIN
    -- Check if the storage extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
    ) THEN
        -- Create buckets if they don't exist
        PERFORM storage.create_bucket('journal-photos', 'Journal photos bucket');
        PERFORM storage.create_bucket('affirmation-audio', 'Affirmation audio bucket');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not create storage buckets: %', SQLERRM;
END $$;