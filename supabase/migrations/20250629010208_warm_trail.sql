/*
  # Fix Badge Progress Update

  1. Changes
    - Fixes ambiguous column references in database functions
    - Improves badge progress tracking logic
    - Ensures proper table qualification in all SQL references
    - Adds explicit error handling for badge updates
  
  2. Reason
    - The current implementation has ambiguous column references causing SQL errors
    - Badge progress wasn't updating correctly due to these errors
*/

-- Drop and recreate the update_badges_on_journal_entry function with proper column qualifications
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  entry_count INTEGER;
  streak_count INTEGER;
  mood_variety INTEGER;
BEGIN
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE profiles.user_id = NEW.user_id;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE journal_entries.user_id = NEW.user_id;
  
  -- Get current streak
  streak_count := COALESCE(user_profile.current_streak, 0);
  
  -- Get mood variety (count of distinct moods used)
  SELECT COUNT(DISTINCT journal_entries.mood) INTO mood_variety
  FROM journal_entries
  WHERE journal_entries.user_id = NEW.user_id;
  
  -- Process each badge
  FOR badge_record IN 
    SELECT 
      badges.id, 
      badges.badge_category,
      badges.progress_target
    FROM badges
  LOOP
    BEGIN
      -- Check if user already has this badge
      IF NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
      ) THEN
        -- Create new badge record for user if it doesn't exist
        INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
        VALUES (NEW.user_id, badge_record.id, 0, false);
      END IF;
      
      -- Update progress based on badge category
      IF badge_record.badge_category = 'milestone' THEN
        -- Update entry count badges
        UPDATE user_badges
        SET progress_current = entry_count
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> entry_count);
        
      ELSIF badge_record.badge_category = 'streak' THEN
        -- Update streak badges
        UPDATE user_badges
        SET progress_current = streak_count
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> streak_count);
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'first-entry' THEN
        -- First entry badge
        UPDATE user_badges
        SET progress_current = 1
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND user_badges.earned = false;
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'best-streak-7' THEN
        -- Best streak achievement
        UPDATE user_badges
        SET progress_current = LEAST(user_profile.best_streak, badge_record.progress_target)
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> LEAST(user_profile.best_streak, badge_record.progress_target));
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'mood-variety' THEN
        -- Mood variety badge
        UPDATE user_badges
        SET progress_current = mood_variety
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> mood_variety);
      END IF;
      
      -- Check if badge should be earned now
      UPDATE user_badges
      SET 
        earned = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target THEN true 
          ELSE user_badges.earned 
        END,
        earned_at = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target AND user_badges.earned = false THEN NOW() 
          ELSE user_badges.earned_at 
        END,
        updated_at = NOW()
      WHERE 
        user_badges.user_id = NEW.user_id AND 
        user_badges.badge_id = badge_record.id AND
        (user_badges.earned = false OR user_badges.progress_current <> COALESCE(
          CASE
            WHEN badge_record.badge_category = 'milestone' THEN entry_count
            WHEN badge_record.badge_category = 'streak' THEN streak_count
            WHEN badge_record.badge_category = 'achievement' AND badge_record.id = 'first-entry' THEN 1
            WHEN badge_record.badge_category = 'achievement' AND badge_record.id = 'best-streak-7' THEN LEAST(user_profile.best_streak, badge_record.progress_target)
            WHEN badge_record.badge_category = 'achievement' AND badge_record.id = 'mood-variety' THEN mood_variety
            ELSE user_badges.progress_current
          END, 0
        ));
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue with next badge
        RAISE NOTICE 'Error updating badge %: %', badge_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Update total badges earned in profile
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_badges.user_id = NEW.user_id AND user_badges.earned = true
    ),
    updated_at = NOW()
  WHERE profiles.user_id = NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NEW to allow the transaction to complete
    RAISE NOTICE 'Error in update_badges_on_journal_entry: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the update_profile_on_journal_entry function with proper column qualifications
CREATE OR REPLACE FUNCTION update_profile_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  days_since_last_entry INTEGER;
  new_streak INTEGER;
BEGIN
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE profiles.user_id = NEW.user_id;
  
  -- Calculate days since last entry
  IF user_profile.last_entry_date IS NULL THEN
    days_since_last_entry := 0;
  ELSE
    days_since_last_entry := EXTRACT(DAY FROM (CURRENT_DATE - user_profile.last_entry_date));
  END IF;
  
  -- Calculate new streak
  IF days_since_last_entry <= 1 THEN
    -- Continue or start streak
    IF CURRENT_DATE > user_profile.last_entry_date OR user_profile.last_entry_date IS NULL THEN
      new_streak := COALESCE(user_profile.current_streak, 0) + 1;
    ELSE
      -- Same day entry, keep current streak
      new_streak := COALESCE(user_profile.current_streak, 0);
    END IF;
  ELSE
    -- Streak broken, start new streak
    new_streak := 1;
  END IF;
  
  -- Update the profile with new streak information
  UPDATE profiles 
  SET 
    current_streak = new_streak,
    best_streak = GREATEST(COALESCE(profiles.best_streak, 0), new_streak),
    last_entry_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE profiles.user_id = NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NEW to allow the transaction to complete
    RAISE NOTICE 'Error in update_profile_on_journal_entry: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually refresh badge progress for a user
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  entry_count INTEGER;
  streak_count INTEGER;
  mood_variety INTEGER;
BEGIN
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE profiles.user_id = target_user_id;
  
  IF user_profile IS NULL THEN
    RAISE EXCEPTION 'User profile not found for ID %', target_user_id;
  END IF;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE journal_entries.user_id = target_user_id;
  
  -- Get current streak
  streak_count := COALESCE(user_profile.current_streak, 0);
  
  -- Get mood variety (count of distinct moods used)
  SELECT COUNT(DISTINCT journal_entries.mood) INTO mood_variety
  FROM journal_entries
  WHERE journal_entries.user_id = target_user_id;
  
  -- Process each badge
  FOR badge_record IN 
    SELECT 
      badges.id, 
      badges.badge_category,
      badges.progress_target
    FROM badges
  LOOP
    BEGIN
      -- Check if user already has this badge
      IF NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id
      ) THEN
        -- Create new badge record for user if it doesn't exist
        INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
        VALUES (target_user_id, badge_record.id, 0, false);
      END IF;
      
      -- Update progress based on badge category
      IF badge_record.badge_category = 'milestone' THEN
        -- Update entry count badges
        UPDATE user_badges
        SET progress_current = entry_count
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
      ELSIF badge_record.badge_category = 'streak' THEN
        -- Update streak badges
        UPDATE user_badges
        SET progress_current = streak_count
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'first-entry' THEN
        -- First entry badge
        UPDATE user_badges
        SET progress_current = CASE WHEN entry_count > 0 THEN 1 ELSE 0 END
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'best-streak-7' THEN
        -- Best streak achievement
        UPDATE user_badges
        SET progress_current = LEAST(user_profile.best_streak, badge_record.progress_target)
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
        
      ELSIF badge_record.badge_category = 'achievement' AND badge_record.id = 'mood-variety' THEN
        -- Mood variety badge
        UPDATE user_badges
        SET progress_current = mood_variety
        WHERE user_badges.user_id = target_user_id AND user_badges.badge_id = badge_record.id;
      END IF;
      
      -- Check if badge should be earned now
      UPDATE user_badges
      SET 
        earned = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target THEN true 
          ELSE user_badges.earned 
        END,
        earned_at = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target AND user_badges.earned = false THEN NOW() 
          ELSE user_badges.earned_at 
        END,
        updated_at = NOW()
      WHERE 
        user_badges.user_id = target_user_id AND 
        user_badges.badge_id = badge_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue with next badge
        RAISE NOTICE 'Error updating badge %: %', badge_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Update total badges earned in profile
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_badges.user_id = target_user_id AND user_badges.earned = true
    ),
    updated_at = NOW()
  WHERE profiles.user_id = target_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE EXCEPTION 'Error in refresh_user_badge_progress: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;