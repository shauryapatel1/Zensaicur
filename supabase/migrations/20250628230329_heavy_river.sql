/*
  # Add Affirmation Columns to Journal Entries

  1. Changes
    - Add affirmation_text column to journal_entries table
    - Add affirmation_audio_url column to journal_entries table
  
  2. Reason
    - These columns are needed to store AI-generated affirmations and their audio URLs
    - This supports the new feature where users receive personalized affirmations after saving journal entries
*/

-- Add affirmation columns to journal_entries table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journal_entries' AND column_name = 'affirmation_text'
  ) THEN
    ALTER TABLE public.journal_entries ADD COLUMN affirmation_text TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'journal_entries' AND column_name = 'affirmation_audio_url'
  ) THEN
    ALTER TABLE public.journal_entries ADD COLUMN affirmation_audio_url TEXT;
  END IF;
END $$;

-- Add Premium Supporter badge if it doesn't exist
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES
    ('premium-supporter', 'Premium Supporter', 'Support Zensai with a premium subscription', '👑', 'special', 'epic', 1)
ON CONFLICT (id) DO NOTHING;

-- Create function to check if a user is in trial period (7 days from account creation)
CREATE OR REPLACE FUNCTION is_user_in_trial_period(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_created_at TIMESTAMPTZ;
    trial_period_days INT := 7;
BEGIN
    -- Get user creation date
    SELECT created_at INTO user_created_at
    FROM profiles
    WHERE profiles.user_id = is_user_in_trial_period.user_id;
    
    -- Check if user is within trial period
    RETURN (
        user_created_at IS NOT NULL AND
        (CURRENT_TIMESTAMP - user_created_at) <= (trial_period_days * INTERVAL '1 day')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has premium access (either subscription or trial)
CREATE OR REPLACE FUNCTION has_premium_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_premium BOOLEAN;
    is_in_trial BOOLEAN;
BEGIN
    -- Check if user has premium subscription
    SELECT subscription_status = 'premium' INTO is_premium
    FROM profiles
    WHERE profiles.user_id = has_premium_access.user_id;
    
    -- Check if user is in trial period
    SELECT is_user_in_trial_period(user_id) INTO is_in_trial;
    
    -- User has premium access if they have a premium subscription or are in trial period
    RETURN (is_premium OR is_in_trial);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;