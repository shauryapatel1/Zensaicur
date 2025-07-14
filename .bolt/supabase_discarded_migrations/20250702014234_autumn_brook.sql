/*
  # Fix Streak Calculation Logic

  1. Changes
    - Replaces the procedural streak calculation with a robust SQL approach using window functions
    - Fixes the trigger syntax to properly handle NEW.user_id reference
    - Creates a function to recalculate streaks for all users
  
  2. Reason
    - Previous streak calculation had bugs and ambiguous column references
    - The new approach correctly identifies consecutive days using SQL window functions
    - This provides a more reliable and maintainable solution
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
-- Using a different approach to avoid the NEW.user_id reference issue
CREATE OR REPLACE FUNCTION public.trigger_recalculate_streaks()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the recalculate function with the user_id from the NEW record
    PERFORM public.recalculate_streaks_for_user(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger using the wrapper function
CREATE TRIGGER on_journal_entry_insert
AFTER INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_recalculate_streaks();

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
GRANT EXECUTE ON FUNCTION public.trigger_recalculate_streaks() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.recalculate_streaks_for_user(UUID) IS 
'Recalculates streak information for a user using a robust SQL approach with window functions.';

COMMENT ON FUNCTION public.fix_all_user_streaks() IS 
'Fixes streak calculations for all users by applying the recalculate_streaks_for_user function to each user.';

COMMENT ON FUNCTION public.trigger_recalculate_streaks() IS 
'Trigger function that calls recalculate_streaks_for_user with the user_id from the inserted record.';