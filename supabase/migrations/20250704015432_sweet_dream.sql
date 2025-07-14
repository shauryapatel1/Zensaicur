/*
  # Update Streak Function

  1. Changes
    - Add SECURITY DEFINER to update_streak_on_new_entry function
    - Add detailed logging for better debugging
    - Fix variable naming to avoid ambiguity
  
  2. Reason
    - SECURITY DEFINER ensures the function runs with the permissions of its creator
    - Logging helps track streak calculation issues
    - Renamed variables prevent column reference ambiguity
*/

-- Drop and recreate the streak calculation function with proper security context
CREATE OR REPLACE FUNCTION update_streak_on_new_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  entry_date DATE;
  v_last_entry_date DATE; -- Renamed to avoid ambiguity with column name
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_journal_entry_insert ON journal_entries;
CREATE TRIGGER on_journal_entry_insert
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_new_entry();