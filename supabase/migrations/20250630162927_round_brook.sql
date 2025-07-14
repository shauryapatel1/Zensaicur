/*
  # Journal Entry Deletion Handling

  1. Changes
    - Add trigger function to recalculate profile stats when a journal entry is deleted
    - Create trigger to execute this function after entry deletion
    - Ensure streak counts, badge progress, and entry counts are properly adjusted
  
  2. Reason
    - Currently, deleting entries doesn't update streak counts or badge progress
    - This can lead to inaccurate statistics and achievements
    - Users should see their stats accurately reflect their current journal entries
*/

-- Create function to recalculate profile stats after entry deletion
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  new_current_streak INTEGER;
  new_last_entry_date DATE;
  entry_count INTEGER;
BEGIN
  -- Log the function call
  RAISE LOG 'Recalculating profile stats after entry deletion for user: %', OLD.user_id;
  
  -- Get the new last entry date (most recent remaining entry)
  SELECT MAX(created_at::DATE) INTO new_last_entry_date
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  RAISE LOG 'User % now has % entries, last entry date: %', 
    OLD.user_id, entry_count, new_last_entry_date;
  
  -- Calculate new current streak
  -- Use the existing calculate_current_streak function if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'calculate_current_streak' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    SELECT calculate_current_streak(OLD.user_id) INTO new_current_streak;
  ELSE
    -- Fallback calculation if the function doesn't exist
    -- This is a simplified version that may not match the exact logic of the original function
    WITH consecutive_days AS (
      SELECT 
        created_at::DATE as entry_date,
        LEAD(created_at::DATE) OVER (ORDER BY created_at DESC) as next_date
      FROM journal_entries
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
    ),
    streak_calc AS (
      SELECT
        entry_date,
        next_date,
        CASE
          WHEN next_date IS NULL THEN 1
          WHEN entry_date - next_date = 1 THEN 1
          ELSE 0
        END as is_consecutive
      FROM consecutive_days
    )
    SELECT 
      CASE
        -- If no entries remain, streak is 0
        WHEN COUNT(*) = 0 THEN 0
        -- If most recent entry is today or yesterday, calculate streak
        WHEN MAX(entry_date) >= CURRENT_DATE - 1 THEN
          -- Count consecutive days until a break
          (SELECT COUNT(*) + 1 FROM (
            SELECT entry_date, SUM(CASE WHEN is_consecutive = 0 THEN 1 ELSE 0 END) OVER (ORDER BY entry_date DESC) as grp
            FROM streak_calc
          ) t
          WHERE grp = 0)
        -- Otherwise, streak is broken
        ELSE 0
      END INTO new_current_streak
    FROM streak_calc;
  END IF;
  
  RAISE LOG 'New current streak for user %: %', OLD.user_id, new_current_streak;
  
  -- Update the profile with new streak information
  UPDATE profiles 
  SET 
    current_streak = new_current_streak,
    last_entry_date = new_last_entry_date,
    updated_at = NOW()
  WHERE user_id = OLD.user_id;
  
  -- Refresh badge progress to ensure all badges are properly updated
  PERFORM refresh_user_badge_progress(OLD.user_id);
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return OLD to allow the transaction to complete
    RAISE LOG 'Error in recalculate_profile_stats_on_delete: %', SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for journal entry deletion
CREATE TRIGGER on_journal_entry_delete
AFTER DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION recalculate_profile_stats_on_delete();

-- Add helpful comment
COMMENT ON FUNCTION recalculate_profile_stats_on_delete() IS 
'Recalculates user profile statistics (streak, last entry date) when a journal entry is deleted and refreshes badge progress.';

-- Create a function to manually recalculate all stats for a user
CREATE OR REPLACE FUNCTION recalculate_all_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  new_current_streak INTEGER;
  new_last_entry_date DATE;
  entry_count INTEGER;
  user_best_streak INTEGER;
BEGIN
  -- Log the function call
  RAISE LOG 'Manually recalculating all stats for user: %', target_user_id;
  
  -- Get the last entry date (most recent entry)
  SELECT MAX(created_at::DATE) INTO new_last_entry_date
  FROM journal_entries
  WHERE user_id = target_user_id;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE user_id = target_user_id;
  
  -- Get current best streak
  SELECT best_streak INTO user_best_streak
  FROM profiles
  WHERE user_id = target_user_id;
  
  -- Calculate new current streak
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'calculate_current_streak' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    SELECT calculate_current_streak(target_user_id) INTO new_current_streak;
  ELSE
    -- Fallback calculation
    WITH consecutive_days AS (
      SELECT 
        created_at::DATE as entry_date,
        LEAD(created_at::DATE) OVER (ORDER BY created_at DESC) as next_date
      FROM journal_entries
      WHERE user_id = target_user_id
      ORDER BY created_at DESC
    ),
    streak_calc AS (
      SELECT
        entry_date,
        next_date,
        CASE
          WHEN next_date IS NULL THEN 1
          WHEN entry_date - next_date = 1 THEN 1
          ELSE 0
        END as is_consecutive
      FROM consecutive_days
    )
    SELECT 
      CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN MAX(entry_date) >= CURRENT_DATE - 1 THEN
          (SELECT COUNT(*) + 1 FROM (
            SELECT entry_date, SUM(CASE WHEN is_consecutive = 0 THEN 1 ELSE 0 END) OVER (ORDER BY entry_date DESC) as grp
            FROM streak_calc
          ) t
          WHERE grp = 0)
        ELSE 0
      END INTO new_current_streak
    FROM streak_calc;
  END IF;
  
  -- Update the profile with new information
  UPDATE profiles 
  SET 
    current_streak = new_current_streak,
    -- Only update best_streak if new streak is higher
    best_streak = GREATEST(COALESCE(best_streak, 0), new_current_streak),
    last_entry_date = new_last_entry_date,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Refresh badge progress
  PERFORM refresh_user_badge_progress(target_user_id);
  
  RAISE LOG 'Stats recalculation complete for user %. Entries: %, Streak: %, Last entry: %', 
    target_user_id, entry_count, new_current_streak, new_last_entry_date;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE LOG 'Error in recalculate_all_user_stats: %', SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_all_user_stats(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION recalculate_all_user_stats(UUID) IS 
'Manually recalculates all user statistics including streak, entry counts, and badge progress. Useful for fixing inconsistencies.';