/*
  # Fix Ambiguous Column Reference in Badge Progress Function

  1. Changes
     - Fixes the ambiguous column reference "best_streak" in the refresh_user_badge_progress function
     - Adds table qualifiers to all column references to avoid ambiguity
     - Improves the function to properly update badge progress and earned status
  
  2. Security
     - Ensures SECURITY DEFINER is set for proper execution privileges
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS refresh_user_badge_progress;

-- Create the improved function with fixed column references
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry_count INTEGER;
  current_streak INTEGER;
  user_best_streak INTEGER;
BEGIN
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries 
  WHERE journal_entries.user_id = target_user_id;
  
  -- Get current streak and best streak
  SELECT 
    profiles.current_streak, 
    profiles.best_streak INTO current_streak, user_best_streak
  FROM profiles
  WHERE profiles.user_id = target_user_id;
  
  -- Update milestone badges (based on total entries)
  UPDATE user_badges 
  SET 
    progress_current = entry_count,
    earned = CASE WHEN entry_count >= progress_target THEN true ELSE earned END,
    earned_at = CASE WHEN entry_count >= progress_target AND earned_at IS NULL THEN now() ELSE earned_at END
  WHERE 
    user_badges.user_id = target_user_id 
    AND badge_category = 'milestone';
  
  -- Update streak badges (based on current streak)
  UPDATE user_badges 
  SET 
    progress_current = current_streak,
    earned = CASE WHEN current_streak >= progress_target THEN true ELSE earned END,
    earned_at = CASE WHEN current_streak >= progress_target AND earned_at IS NULL THEN now() ELSE earned_at END
  WHERE 
    user_badges.user_id = target_user_id 
    AND badge_category = 'streak';
  
  -- Calculate progress percentage for all badges
  UPDATE user_badges 
  SET 
    progress_percentage = CASE 
      WHEN progress_target > 0 THEN 
        LEAST(ROUND((progress_current::numeric / progress_target::numeric) * 100), 100)
      ELSE 0
    END
  WHERE user_badges.user_id = target_user_id;
  
  -- Update total badges earned in profile
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*) 
      FROM user_badges 
      WHERE user_badges.user_id = target_user_id AND user_badges.earned = true
    )
  WHERE profiles.user_id = target_user_id;
  
  RAISE LOG 'Refreshed badge progress for user % with % entries, current streak: %, best streak: %', 
    target_user_id, entry_count, current_streak, user_best_streak;
END;
$$;

-- Create a function to calculate current streak
CREATE OR REPLACE FUNCTION calculate_current_streak(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak INTEGER := 0;
  last_date DATE := NULL;
  current_date DATE := CURRENT_DATE;
  entry_date DATE;
  entries CURSOR FOR
    SELECT created_at::DATE
    FROM journal_entries
    WHERE user_id = target_user_id
    ORDER BY created_at::DATE DESC;
BEGIN
  -- Open the cursor and fetch the first (most recent) entry date
  OPEN entries;
  FETCH entries INTO entry_date;
  
  -- If no entries, return 0
  IF entry_date IS NULL THEN
    CLOSE entries;
    RETURN 0;
  END IF;
  
  -- Check if the most recent entry is from today or yesterday
  IF entry_date = current_date OR entry_date = current_date - 1 THEN
    streak := 1;
    last_date := entry_date;
    
    -- Continue counting consecutive days
    LOOP
      FETCH entries INTO entry_date;
      EXIT WHEN entry_date IS NULL;
      
      -- If this entry is consecutive with the last one, increment streak
      IF entry_date = last_date - 1 THEN
        streak := streak + 1;
        last_date := entry_date;
      -- If this is a duplicate date, just update last_date
      ELSIF entry_date = last_date THEN
        last_date := entry_date;
      -- If there's a gap, exit the loop
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  CLOSE entries;
  RETURN streak;
END;
$$;