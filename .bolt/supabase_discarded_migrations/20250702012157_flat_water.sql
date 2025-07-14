/*
  # Definitive Streak Calculation Fix

  1. Changes
    - Replaces the procedural streak calculation with a robust SQL-based approach using window functions
    - Fixes ambiguous column references and eliminates complex date logic
    - Creates a more reliable trigger for journal entries
    - Updates the fix_all_user_streaks function to use the new logic
  
  2. Reason
    - Previous streak calculation was not properly incrementing for consecutive days
    - The procedural approach was prone to off-by-one errors and complex date logic
    - Window functions provide a more reliable and performant solution for identifying consecutive sequences
*/

-- Step 1: Drop the old, problematic trigger and function
DROP TRIGGER IF EXISTS on_journal_entry_insert ON public.journal_entries;
DROP FUNCTION IF EXISTS public.update_profile_on_journal_entry();

-- Step 2: Create the new, correct function to recalculate streaks
CREATE OR REPLACE FUNCTION public.recalculate_streaks_for_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    new_current_streak INT;
    new_best_streak INT;
    last_entry_date DATE;
BEGIN
    WITH user_entry_dates AS (
        -- Get distinct dates to handle multiple entries on the same day
        SELECT DISTINCT created_at::DATE AS entry_date
        FROM public.journal_entries
        WHERE user_id = target_user_id
    ),
    date_diffs AS (
        -- Calculate the difference in days from the previous entry
        SELECT
            entry_date,
            entry_date - LAG(entry_date, 1, entry_date) OVER (ORDER BY entry_date) AS diff
        FROM user_entry_dates
    ),
    streak_groups AS (
        -- Assign a unique ID to each group of consecutive days
        SELECT
            entry_date,
            SUM(CASE WHEN diff > 1 THEN 1 ELSE 0 END) OVER (ORDER BY entry_date) AS streak_group
        FROM date_diffs
    ),
    streaks AS (
        -- Count the number of days in each streak
        SELECT
            streak_group,
            COUNT(*) AS streak_length,
            MAX(entry_date) AS last_day_of_streak
        FROM streak_groups
        GROUP BY streak_group
    )
    -- Select the final calculated values into variables
    SELECT
        -- Current streak is the length of the most recent streak, ONLY if it's active (today or yesterday)
        CASE
            WHEN MAX(last_day_of_streak) >= CURRENT_DATE - INTERVAL '1 day'
            THEN (SELECT streak_length FROM streaks ORDER BY last_day_of_streak DESC LIMIT 1)
            ELSE 0
        END,
        -- Best streak is the maximum length found across all streaks
        COALESCE(MAX(streak_length), 0),
        -- The date of the very last entry
        MAX(entry_date)
    INTO new_current_streak, new_best_streak, last_entry_date
    FROM streaks, user_entry_dates;

    -- Log the calculated values for debugging
    RAISE LOG 'Recalculated streaks for user %: current=%s, best=%s, last_entry=%s', 
        target_user_id, new_current_streak, new_best_streak, last_entry_date;

    -- Step 3: Update the user's profile with the new, correct values
    UPDATE public.profiles
    SET
        current_streak = COALESCE(new_current_streak, 0),
        best_streak = GREATEST(profiles.best_streak, COALESCE(new_best_streak, 0)),
        last_entry_date = last_entry_date,
        updated_at = NOW()
    WHERE profiles.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the new trigger that calls the correct function
CREATE TRIGGER on_journal_entry_insert
AFTER INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_streaks_for_user(NEW.user_id);

-- Step 5: Update the manual fix-it function to use the new logic
CREATE OR REPLACE FUNCTION public.fix_all_user_streaks()
RETURNS TABLE (
  user_id UUID,
  recalculated_current_streak INT,
  recalculated_best_streak INT
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT p.user_id FROM public.profiles p LOOP
        -- Call the new, robust function for each user
        PERFORM public.recalculate_streaks_for_user(user_record.user_id);

        -- Return the results
        SELECT p.user_id, p.current_streak, p.best_streak
        INTO user_id, recalculated_current_streak, recalculated_best_streak
        FROM public.profiles p WHERE p.user_id = user_record.user_id;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.fix_all_user_streaks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_streaks_for_user(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.recalculate_streaks_for_user(UUID) IS 
'Recalculates streak information for a user using a robust SQL approach with window functions.';

COMMENT ON FUNCTION public.fix_all_user_streaks() IS 
'Fixes streak calculations for all users by applying the recalculate_streaks_for_user function to each user.';