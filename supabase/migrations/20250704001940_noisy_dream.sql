/*
  # Fix PostgreSQL EXTRACT function syntax error

  1. Database Functions
    - Fix `update_streak_on_new_entry` function to use correct EXTRACT syntax
    - Fix `recalculate_profile_stats_on_delete` function if needed
    - Fix `trigger_recalculate_streaks` function if needed

  2. Changes Made
    - Replace incorrect EXTRACT(column, value) with EXTRACT(field FROM column)
    - Ensure proper date/time field extraction for streak calculations
    - Update any other functions that may have similar issues

  3. Notes
    - This fixes the "function pg_catalog.extract(unknown, integer) does not exist" error
    - Ensures journal entry creation and deletion work properly
    - Maintains existing streak calculation logic
*/

-- Drop and recreate the streak calculation function with correct EXTRACT syntax
CREATE OR REPLACE FUNCTION update_streak_on_new_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  entry_date DATE;
  last_entry_date DATE;
  days_diff INTEGER;
BEGIN
  -- Get the date of the new entry
  entry_date := DATE(NEW.created_at);
  
  -- Get user's current profile data
  SELECT current_streak, best_streak, last_entry_date
  INTO user_profile
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO profiles (user_id, current_streak, best_streak, last_entry_date)
    VALUES (NEW.user_id, 1, 1, entry_date);
    RETURN NEW;
  END IF;
  
  last_entry_date := user_profile.last_entry_date;
  
  -- Calculate streak
  IF last_entry_date IS NULL THEN
    -- First entry ever
    UPDATE profiles 
    SET current_streak = 1,
        best_streak = GREATEST(1, user_profile.best_streak),
        last_entry_date = entry_date
    WHERE user_id = NEW.user_id;
  ELSE
    -- Calculate days difference
    days_diff := entry_date - last_entry_date;
    
    IF days_diff = 1 THEN
      -- Consecutive day - increment streak
      UPDATE profiles 
      SET current_streak = user_profile.current_streak + 1,
          best_streak = GREATEST(user_profile.current_streak + 1, user_profile.best_streak),
          last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    ELSIF days_diff = 0 THEN
      -- Same day - just update last_entry_date, don't change streak
      UPDATE profiles 
      SET last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    ELSE
      -- Streak broken - reset to 1
      UPDATE profiles 
      SET current_streak = 1,
          best_streak = GREATEST(1, user_profile.best_streak),
          last_entry_date = entry_date
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the badge update function with correct syntax
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  entry_date DATE;
  days_this_month INTEGER;
  entries_this_month INTEGER;
BEGIN
  -- Get user profile
  SELECT current_streak, best_streak INTO user_profile
  FROM profiles WHERE user_id = NEW.user_id;
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = NEW.user_id;
  
  -- Get entry date
  entry_date := DATE(NEW.created_at);
  
  -- Get entries this month
  SELECT COUNT(*) INTO entries_this_month
  FROM journal_entries 
  WHERE user_id = NEW.user_id 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM entry_date)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM entry_date);
  
  -- Update badge progress for various badges
  
  -- First Entry badge
  INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
  VALUES (NEW.user_id, 'first-entry', 1, true, NOW())
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = 1,
    earned = true,
    earned_at = COALESCE(user_badges.earned_at, NOW());
  
  -- Entry count badges (5, 10, 25, 50, 100 entries)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries' AND id != 'first-entry'
  LOOP
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      total_entries,
      total_entries >= badge_record.progress_target,
      CASE WHEN total_entries >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = total_entries,
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
    WHERE badge_category = 'streaks'
  LOOP
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      COALESCE(user_profile.current_streak, 0),
      COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      CASE WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = COALESCE(user_profile.current_streak, 0),
      earned = COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      earned_at = CASE 
        WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Monthly badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'monthly'
  LOOP
    INSERT INTO user_badges (user_id, badge_id, progress_current, earned, earned_at)
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      entries_this_month,
      entries_this_month >= badge_record.progress_target,
      CASE WHEN entries_this_month >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = entries_this_month,
      earned = entries_this_month >= badge_record.progress_target,
      earned_at = CASE 
        WHEN entries_this_month >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Update total badges earned count in profile
  UPDATE profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) 
    FROM user_badges 
    WHERE user_id = NEW.user_id AND earned = true
  )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the recalculate streaks function
CREATE OR REPLACE FUNCTION trigger_recalculate_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is called after insert to recalculate streaks
  -- The actual streak calculation is done in update_streak_on_new_entry
  -- This is just a placeholder that can be extended for additional logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the profile stats recalculation function for deletions
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  latest_entry RECORD;
  entry_count INTEGER;
  current_streak_calc INTEGER := 0;
  best_streak_calc INTEGER := 0;
  temp_streak INTEGER := 0;
  prev_date DATE;
  curr_date DATE;
  entry_cursor CURSOR FOR 
    SELECT DATE(created_at) as entry_date 
    FROM journal_entries 
    WHERE user_id = OLD.user_id 
    ORDER BY created_at DESC;
BEGIN
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries WHERE user_id = OLD.user_id;
  
  -- If no entries left, reset everything
  IF entry_count = 0 THEN
    UPDATE profiles 
    SET current_streak = 0,
        best_streak = 0,
        last_entry_date = NULL,
        total_badges_earned = 0
    WHERE user_id = OLD.user_id;
    
    -- Reset all badges
    DELETE FROM user_badges WHERE user_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  -- Get the latest entry date
  SELECT DATE(created_at) INTO latest_entry
  FROM journal_entries 
  WHERE user_id = OLD.user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Recalculate streaks by going through entries in reverse chronological order
  prev_date := NULL;
  current_streak_calc := 0;
  best_streak_calc := 0;
  temp_streak := 0;
  
  FOR entry_rec IN entry_cursor LOOP
    curr_date := entry_rec.entry_date;
    
    IF prev_date IS NULL THEN
      -- First entry (most recent)
      temp_streak := 1;
      current_streak_calc := 1;
    ELSIF prev_date - curr_date = 1 THEN
      -- Consecutive day
      temp_streak := temp_streak + 1;
      IF current_streak_calc = temp_streak - 1 THEN
        current_streak_calc := temp_streak;
      END IF;
    ELSIF prev_date = curr_date THEN
      -- Same day, don't change streak
      NULL;
    ELSE
      -- Gap in dates, reset temp streak
      best_streak_calc := GREATEST(best_streak_calc, temp_streak);
      temp_streak := 1;
    END IF;
    
    prev_date := curr_date;
  END LOOP;
  
  -- Final best streak calculation
  best_streak_calc := GREATEST(best_streak_calc, temp_streak);
  
  -- Update profile with recalculated values
  UPDATE profiles 
  SET current_streak = current_streak_calc,
      best_streak = best_streak_calc,
      last_entry_date = latest_entry
  WHERE user_id = OLD.user_id;
  
  -- Recalculate badges (this will be handled by triggers on the remaining entries)
  -- For now, just update the total count
  UPDATE profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) 
    FROM user_badges 
    WHERE user_id = OLD.user_id AND earned = true
  )
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Ensure triggers are properly set up
DROP TRIGGER IF EXISTS on_journal_entry_insert ON journal_entries;
CREATE TRIGGER on_journal_entry_insert
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_streaks();

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