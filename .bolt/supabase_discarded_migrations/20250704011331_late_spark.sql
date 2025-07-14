/*
  # Add SECURITY DEFINER and debug logs to database functions

  1. Changes
    - Add SECURITY DEFINER to all database functions to ensure they run with proper permissions
    - Add RAISE LOG statements to functions for better debugging
    - Create a new refresh_user_badge_progress function for manual badge updates
    - Fix badge progress percentage calculation
  
  2. Reason
    - Database triggers need SECURITY DEFINER to execute with elevated privileges
    - Debug logs help diagnose issues with trigger execution
    - Manual refresh function provides a fallback when triggers don't work
*/

-- Add SECURITY DEFINER to update_streak_on_new_entry function
CREATE OR REPLACE FUNCTION update_streak_on_new_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Add SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  entry_date DATE;
  v_last_entry_date DATE;
  days_diff INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'update_streak_on_new_entry triggered for user: %, entry date: %', NEW.user_id, NEW.created_at;
  
  -- Get the date of the new entry
  entry_date := DATE(NEW.created_at);
  
  -- Get user's current profile data
  SELECT current_streak, best_streak, last_entry_date
  INTO user_profile
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    RAISE LOG 'No profile found for user %, creating new profile', NEW.user_id;
    INSERT INTO profiles (user_id, current_streak, best_streak, last_entry_date)
    VALUES (NEW.user_id, 1, 1, entry_date);
    RETURN NEW;
  END IF;
  
  v_last_entry_date := user_profile.last_entry_date;
  
  -- Calculate streak
  IF v_last_entry_date IS NULL THEN
    -- First entry ever
    RAISE LOG 'First entry ever for user %', NEW.user_id;
    UPDATE profiles 
    SET current_streak = 1,
        best_streak = GREATEST(1, user_profile.best_streak),
        last_entry_date = entry_date
    WHERE user_id = NEW.user_id;
  ELSE
    -- Calculate days difference
    days_diff := entry_date - v_last_entry_date;
    RAISE LOG 'Days difference for user %: % days', NEW.user_id, days_diff;
    
    IF days_diff = 1 THEN
      -- Consecutive day - increment streak
      RAISE LOG 'Consecutive day for user %, incrementing streak from % to %', 
        NEW.user_id, user_profile.current_streak, user_profile.current_streak + 1;
      UPDATE profiles 
      SET current_streak = user_profile.current_streak + 1,
          best_streak = GREATEST(user_profile.current_streak + 1, user_profile.best_streak),
          last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    ELSIF days_diff = 0 THEN
      -- Same day - just update last_entry_date, don't change streak
      RAISE LOG 'Same day entry for user %, maintaining streak at %', NEW.user_id, user_profile.current_streak;
      UPDATE profiles 
      SET last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    ELSE
      -- Streak broken - reset to 1
      RAISE LOG 'Streak broken for user %, resetting from % to 1', NEW.user_id, user_profile.current_streak;
      UPDATE profiles 
      SET current_streak = 1,
          best_streak = GREATEST(1, user_profile.best_streak),
          last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add SECURITY DEFINER to update_badges_on_journal_entry function
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Add SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  entry_date DATE;
  days_this_month INTEGER;
  entries_this_month INTEGER;
  progress_pct NUMERIC;
  badge_count INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'update_badges_on_journal_entry triggered for user: %, entry: %', NEW.user_id, NEW.id;
  
  -- Get user profile
  SELECT current_streak, best_streak INTO user_profile
  FROM profiles WHERE user_id = NEW.user_id;
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = NEW.user_id;
  
  RAISE LOG 'User % has % total entries, current streak: %', 
    NEW.user_id, total_entries, COALESCE(user_profile.current_streak, 0);
  
  -- Get entry date
  entry_date := DATE(NEW.created_at);
  
  -- Get entries this month
  SELECT COUNT(*) INTO entries_this_month
  FROM journal_entries 
  WHERE user_id = NEW.user_id 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM entry_date)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM entry_date);
  
  -- First Entry badge
  INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
  VALUES (NEW.user_id, 'first-entry', 1, 100, true, NOW())
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = 1,
    progress_percentage = 100,
    earned = true,
    earned_at = COALESCE(user_badges.earned_at, NOW());
  
  RAISE LOG 'Updated first-entry badge for user %', NEW.user_id;
  
  -- Entry count badges (5, 10, 25, 50, 100 entries)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries' AND id != 'first-entry'
  LOOP
    -- Calculate progress percentage
    progress_pct := LEAST(100, ROUND((total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing entry badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, total_entries, progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      total_entries,
      progress_pct,
      total_entries >= badge_record.progress_target,
      CASE WHEN total_entries >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = total_entries,
      progress_percentage = progress_pct,
      earned = total_entries >= badge_record.progress_target,
      earned_at = CASE 
        WHEN total_entries >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Streak badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'streak'
  LOOP
    -- Calculate progress percentage for streak badges
    progress_pct := LEAST(100, ROUND((COALESCE(user_profile.current_streak, 0)::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing streak badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, COALESCE(user_profile.current_streak, 0), progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      COALESCE(user_profile.current_streak, 0),
      progress_pct,
      COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      CASE WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = COALESCE(user_profile.current_streak, 0),
      progress_percentage = progress_pct,
      earned = COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      earned_at = CASE 
        WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Update total badges earned count in profile
  SELECT COUNT(*) INTO badge_count
  FROM user_badges 
  WHERE user_id = NEW.user_id AND earned = true;
  
  UPDATE profiles 
  SET total_badges_earned = badge_count
  WHERE user_id = NEW.user_id;
  
  RAISE LOG 'Updated total_badges_earned for user % to %', NEW.user_id, badge_count;
  
  RETURN NEW;
END;
$$;

-- Add SECURITY DEFINER to recalculate_profile_stats_on_delete function
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Add SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  latest_entry RECORD;
  entry_count INTEGER;
  badge_count INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'recalculate_profile_stats_on_delete triggered for user: %, deleted entry: %', OLD.user_id, OLD.id;
  
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries WHERE user_id = OLD.user_id;
  
  RAISE LOG 'User % has % entries remaining after deletion', OLD.user_id, entry_count;
  
  -- If no entries left, reset everything
  IF entry_count = 0 THEN
    RAISE LOG 'No entries left for user %, resetting profile', OLD.user_id;
    UPDATE profiles 
    SET current_streak = 0,
        best_streak = 0,
        last_entry_date = NULL,
        total_badges_earned = 0
    WHERE user_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  -- Get the latest entry date
  SELECT DATE(created_at) INTO latest_entry
  FROM journal_entries 
  WHERE user_id = OLD.user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Update profile with latest entry date
  UPDATE profiles 
  SET last_entry_date = latest_entry
  WHERE user_id = OLD.user_id;
  
  -- Update badge progress for entry count badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries'
  LOOP
    -- Calculate progress percentage
    UPDATE user_badges
    SET progress_current = entry_count,
        progress_percentage = LEAST(100, ROUND((entry_count::NUMERIC / badge_record.progress_target::NUMERIC) * 100)),
        earned = entry_count >= badge_record.progress_target,
        earned_at = CASE 
          WHEN entry_count >= badge_record.progress_target AND earned_at IS NULL THEN NOW() 
          WHEN entry_count < badge_record.progress_target THEN NULL
          ELSE earned_at 
        END
    WHERE user_id = OLD.user_id AND badge_id = badge_record.id;
  END LOOP;
  
  -- Update total badges earned count in profile
  SELECT COUNT(*) INTO badge_count
  FROM user_badges 
  WHERE user_id = OLD.user_id AND earned = true;
  
  UPDATE profiles 
  SET total_badges_earned = badge_count
  WHERE user_id = OLD.user_id;
  
  RAISE LOG 'Updated total_badges_earned for user % to % after deletion', OLD.user_id, badge_count;
  
  RETURN OLD;
END;
$$;

-- Create a function to manually refresh badge progress
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Add SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  latest_entry_date DATE;
  entries_this_month INTEGER;
  progress_pct NUMERIC;
  badge_count INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'refresh_user_badge_progress called for user: %', target_user_id;
  
  -- Get user profile
  SELECT current_streak, best_streak, last_entry_date INTO user_profile
  FROM profiles WHERE user_id = target_user_id;
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = target_user_id;
  
  RAISE LOG 'User % has % total entries, current streak: %', 
    target_user_id, total_entries, COALESCE(user_profile.current_streak, 0);
  
  -- Get latest entry date
  SELECT DATE(created_at) INTO latest_entry_date
  FROM journal_entries 
  WHERE user_id = target_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- First Entry badge - always 100% progress if any entries exist
  IF total_entries > 0 THEN
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (target_user_id, 'first-entry', 1, 100, true, NOW())
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = 1,
      progress_percentage = 100,
      earned = true,
      earned_at = COALESCE(user_badges.earned_at, NOW());
    
    RAISE LOG 'Updated first-entry badge for user %', target_user_id;
  END IF;
  
  -- Entry count badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries' AND id != 'first-entry'
  LOOP
    -- Calculate progress percentage
    progress_pct := LEAST(100, ROUND((total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing entry badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, total_entries, progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      target_user_id, 
      badge_record.id, 
      total_entries,
      progress_pct,
      total_entries >= badge_record.progress_target,
      CASE WHEN total_entries >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = total_entries,
      progress_percentage = progress_pct,
      earned = total_entries >= badge_record.progress_target,
      earned_at = CASE 
        WHEN total_entries >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Streak badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'streak'
  LOOP
    -- Calculate progress percentage for streak badges
    progress_pct := LEAST(100, ROUND((COALESCE(user_profile.current_streak, 0)::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing streak badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, COALESCE(user_profile.current_streak, 0), progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      target_user_id, 
      badge_record.id, 
      COALESCE(user_profile.current_streak, 0),
      progress_pct,
      COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      CASE WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = COALESCE(user_profile.current_streak, 0),
      progress_percentage = progress_pct,
      earned = COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      earned_at = CASE 
        WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Update total badges earned count in profile
  SELECT COUNT(*) INTO badge_count
  FROM user_badges 
  WHERE user_id = target_user_id AND earned = true;
  
  UPDATE profiles 
  SET total_badges_earned = badge_count
  WHERE user_id = target_user_id;
  
  RAISE LOG 'Updated total_badges_earned for user % to %', target_user_id, badge_count;
END;
$$;

-- Ensure the triggers are properly set up with the updated functions
DROP TRIGGER IF EXISTS on_journal_entry_badge_update ON journal_entries;
CREATE TRIGGER on_journal_entry_badge_update
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_on_journal_entry();

DROP TRIGGER IF EXISTS on_journal_entry_delete ON journal_entries;
CREATE TRIGGER on_journal_entry_delete
  AFTER DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_profile_stats_on_delete();

-- Create a policy to allow the functions to update user_badges
DROP POLICY IF EXISTS "Users and functions can update badges" ON user_badges;
CREATE POLICY "Users and functions can update badges"
  ON user_badges
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR (auth.uid() IS NULL))
  WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL));

-- Create a policy to allow the functions to insert user_badges
DROP POLICY IF EXISTS "Users and functions can insert badges" ON user_badges;
CREATE POLICY "Users and functions can insert badges"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL));