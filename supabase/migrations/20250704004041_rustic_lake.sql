/*
  # Fix Ambiguous Column Reference in Streak Calculation

  1. Changes
    - Fixes the ambiguous column reference "last_entry_date" in update_streak_on_new_entry function
    - Renames the local variable to v_last_entry_date to avoid conflict with the column name
    - Updates all references to use the renamed variable
  
  2. Reason
    - The current function has a variable with the same name as a table column
    - This causes the "column reference last_entry_date is ambiguous" error
    - PostgreSQL can't determine if you're referring to the variable or the column
*/

-- Drop and recreate the streak calculation function with renamed variables
CREATE OR REPLACE FUNCTION update_streak_on_new_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  entry_date DATE;
  v_last_entry_date DATE; -- Renamed from last_entry_date to avoid ambiguity
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
  
  v_last_entry_date := user_profile.last_entry_date; -- Use the renamed variable
  
  -- Calculate streak
  IF v_last_entry_date IS NULL THEN
    -- First entry ever
    UPDATE profiles 
    SET current_streak = 1,
        best_streak = GREATEST(1, user_profile.best_streak),
        last_entry_date = entry_date
    WHERE user_id = NEW.user_id;
  ELSE
    -- Calculate days difference
    days_diff := entry_date - v_last_entry_date; -- Use the renamed variable
    
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

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_journal_entry_insert ON journal_entries;

-- Recreate the trigger with the correct function
CREATE TRIGGER on_journal_entry_insert
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_new_entry();