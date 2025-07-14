/*
  # Fix Badge Progress Issues

  1. Changes
    - Fixes the refresh_user_badge_progress function to properly handle all badge categories
    - Adds proper column qualifications to avoid ambiguity errors
    - Adds support for the Premium Supporter badge
    - Improves error handling and logging
    - Ensures consistent badge progress calculation between manual refresh and automatic triggers
  
  2. Reason
    - Badge progress was not updating correctly due to ambiguous column references
    - The Premium Supporter badge wasn't being properly awarded to premium subscribers
    - Error messages were not providing enough context for debugging
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS refresh_user_badge_progress(uuid);

-- Create improved function with fixed column references and better error handling
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry_count INTEGER;
  current_streak INTEGER;
  user_best_streak INTEGER;
  mood_variety INTEGER;
  is_premium BOOLEAN;
  badge_record RECORD;
  total_earned INTEGER := 0;
BEGIN
  -- Log the function call
  RAISE LOG 'Refreshing badge progress for user: %', target_user_id;
  
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries 
  WHERE journal_entries.user_id = target_user_id;
  
  -- Get current streak and best streak
  SELECT 
    profiles.current_streak, 
    profiles.best_streak,
    profiles.subscription_status = 'premium' INTO current_streak, user_best_streak, is_premium
  FROM profiles
  WHERE profiles.user_id = target_user_id;
  
  -- Get mood variety (count of distinct moods used)
  SELECT COUNT(DISTINCT journal_entries.mood) INTO mood_variety
  FROM journal_entries
  WHERE journal_entries.user_id = target_user_id;
  
  RAISE LOG 'User stats - entries: %, streak: %, best: %, moods: %, premium: %', 
    entry_count, current_streak, user_best_streak, mood_variety, is_premium;
  
  -- Process each badge
  FOR badge_record IN 
    SELECT 
      badges.id, 
      badges.badge_name,
      badges.badge_category,
      badges.badge_rarity,
      badges.progress_target
    FROM badges
  LOOP
    BEGIN
      -- Check if user already has this badge record
      IF NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id
      ) THEN
        -- Create new badge record for user if it doesn't exist
        INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
        VALUES (target_user_id, badge_record.id, 0, false);
        
        RAISE LOG 'Created new badge record for user % and badge %', target_user_id, badge_record.id;
      END IF;
      
      -- Update progress based on badge category
      IF badge_record.badge_category = 'milestone' THEN
        -- Update entry count badges
        UPDATE user_badges
        SET progress_current = entry_count
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
        RAISE LOG 'Updated milestone badge % progress to % for user %', 
          badge_record.id, entry_count, target_user_id;
          
      ELSIF badge_record.badge_category = 'streak' THEN
        -- Update streak badges
        UPDATE user_badges
        SET progress_current = current_streak
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
        RAISE LOG 'Updated streak badge % progress to % for user %', 
          badge_record.id, current_streak, target_user_id;
          
      ELSIF badge_record.badge_category = 'achievement' THEN
        -- Handle different achievement types
        IF badge_record.id = 'first-entry' THEN
          -- First entry badge
          UPDATE user_badges
          SET progress_current = CASE WHEN entry_count > 0 THEN 1 ELSE 0 END
          WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
          
          RAISE LOG 'Updated first-entry badge progress for user %', target_user_id;
          
        ELSIF badge_record.id = 'best-streak-7' THEN
          -- Best streak achievement
          UPDATE user_badges
          SET progress_current = LEAST(user_best_streak, badge_record.progress_target)
          WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
          
          RAISE LOG 'Updated best-streak badge progress to % for user %', 
            LEAST(user_best_streak, badge_record.progress_target), target_user_id;
            
        ELSIF badge_record.id = 'mood-variety' THEN
          -- Mood variety badge
          UPDATE user_badges
          SET progress_current = mood_variety
          WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
          
          RAISE LOG 'Updated mood-variety badge progress to % for user %', 
            mood_variety, target_user_id;
        END IF;
        
      ELSIF badge_record.badge_category = 'special' THEN
        -- Handle special badges
        IF badge_record.id = 'premium-supporter' THEN
          -- Premium supporter badge
          UPDATE user_badges
          SET 
            progress_current = CASE WHEN is_premium THEN 1 ELSE 0 END,
            earned = is_premium,
            earned_at = CASE WHEN is_premium AND earned_at IS NULL THEN NOW() ELSE earned_at END
          WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
          
          RAISE LOG 'Updated premium-supporter badge for user % (premium: %)', 
            target_user_id, is_premium;
        END IF;
      END IF;
      
      -- Check if badge should be earned now (for badges not directly set above)
      IF badge_record.badge_category != 'special' THEN
        UPDATE user_badges
        SET 
          earned = CASE 
            WHEN progress_current >= badge_record.progress_target THEN true 
            ELSE earned 
          END,
          earned_at = CASE 
            WHEN progress_current >= badge_record.progress_target AND earned = false THEN NOW() 
            ELSE earned_at 
          END,
          updated_at = NOW()
        WHERE 
          user_badges.user_id = target_user_id AND 
          user_badges.badge_id = badge_record.id AND
          (earned = false AND progress_current >= badge_record.progress_target);
          
        IF FOUND THEN
          RAISE LOG 'User % earned badge %!', target_user_id, badge_record.id;
        END IF;
      END IF;
      
      -- Calculate progress percentage for all badges
      UPDATE user_badges
      SET progress_percentage = CASE 
        WHEN badge_record.progress_target > 0 THEN 
          LEAST(ROUND((progress_current::numeric / badge_record.progress_target::numeric) * 100), 100)
        ELSE 0
      END
      WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue with next badge
        RAISE LOG 'Error updating badge %: %', badge_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Count total earned badges
  SELECT COUNT(*) INTO total_earned
  FROM user_badges
  WHERE user_badges.user_id = target_user_id AND user_badges.earned = true;
  
  -- Update total badges earned in profile
  UPDATE profiles
  SET 
    total_badges_earned = total_earned,
    updated_at = NOW()
  WHERE profiles.user_id = target_user_id;
  
  RAISE LOG 'Badge refresh complete for user %. Total earned: %', target_user_id, total_earned;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE LOG 'Error in refresh_user_badge_progress: %', SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION refresh_user_badge_progress(uuid) TO authenticated;

-- Create or replace the get_user_badge_progress function to ensure it returns all fields
CREATE OR REPLACE FUNCTION get_user_badge_progress(target_user_id uuid)
RETURNS TABLE (
  id text,
  badge_name text,
  badge_description text,
  badge_icon text,
  badge_category text,
  badge_rarity text,
  earned boolean,
  earned_at timestamptz,
  progress_current integer,
  progress_target integer,
  progress_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, ensure all badges exist for this user
  INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
  SELECT 
    target_user_id,
    badges.id,
    0,
    false
  FROM badges
  WHERE NOT EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_badges.user_id = target_user_id 
    AND user_badges.badge_id = badges.id
  );
  
  -- Then return the badge progress data
  RETURN QUERY
  SELECT 
    badges.id,
    badges.badge_name,
    badges.badge_description,
    badges.badge_icon,
    badges.badge_category,
    badges.badge_rarity,
    COALESCE(user_badges.earned, false) as earned,
    user_badges.earned_at,
    COALESCE(user_badges.progress_current, 0) as progress_current,
    badges.progress_target,
    COALESCE(user_badges.progress_percentage, 
      ROUND(
        (COALESCE(user_badges.progress_current, 0)::numeric / 
         NULLIF(badges.progress_target, 0)::numeric) * 100, 
        2
      )
    ) as progress_percentage
  FROM badges
  LEFT JOIN user_badges ON 
    badges.id = user_badges.badge_id AND 
    user_badges.user_id = target_user_id
  ORDER BY 
    CASE badges.badge_rarity 
      WHEN 'legendary' THEN 1
      WHEN 'epic' THEN 2  
      WHEN 'rare' THEN 3
      ELSE 4
    END,
    badges.badge_category,
    badges.badge_name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_badge_progress(uuid) TO authenticated;

-- Add progress_percentage column to user_badges if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_badges' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE user_badges ADD COLUMN progress_percentage NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add Premium Supporter badge if it doesn't exist
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES
    ('premium-supporter', 'Premium Supporter', 'Support Zensai with a premium subscription', '👑', 'special', 'epic', 1)
ON CONFLICT (id) DO NOTHING;

-- Update existing premium users to have the Premium Supporter badge
DO $$
DECLARE
  premium_user RECORD;
BEGIN
  FOR premium_user IN
    SELECT user_id FROM profiles WHERE subscription_status = 'premium'
  LOOP
    -- Ensure the badge exists for this user
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
    VALUES (premium_user.user_id, 'premium-supporter', 1, true, NOW())
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET
      progress_current = 1,
      earned = true,
      earned_at = COALESCE(user_badges.earned_at, NOW()),
      updated_at = NOW();
  END LOOP;
END $$;