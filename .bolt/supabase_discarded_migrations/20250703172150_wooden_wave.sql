/*
  # Fix interval vs integer comparison error

  1. Problem
    - Database functions are comparing interval types with integers
    - This causes "operator does not exist: interval <> integer" error
    - Occurs when adding journal entries due to streak calculation functions

  2. Solution
    - Update streak calculation functions to properly handle date comparisons
    - Use EXTRACT to convert intervals to integers for comparison
    - Ensure consistent data types in all comparisons

  3. Functions Updated
    - recalculate_streaks_for_user: Fixed date difference calculations
    - update_badges_on_journal_entry: Fixed streak-related badge logic
*/

-- Drop existing functions to recreate them with fixes
DROP FUNCTION IF EXISTS recalculate_streaks_for_user(uuid);
DROP FUNCTION IF EXISTS update_badges_on_journal_entry();
DROP FUNCTION IF EXISTS recalculate_profile_stats_on_delete();

-- Recreate recalculate_streaks_for_user function with proper type handling
CREATE OR REPLACE FUNCTION recalculate_streaks_for_user(target_user_id uuid)
RETURNS void AS $$
DECLARE
    entry_record RECORD;
    current_streak_count integer := 0;
    best_streak_count integer := 0;
    temp_streak integer := 0;
    last_date date;
    current_date date;
    date_diff integer;
BEGIN
    -- Get all journal entries for the user, ordered by date
    FOR entry_record IN 
        SELECT DATE(created_at) as entry_date
        FROM journal_entries 
        WHERE user_id = target_user_id 
        ORDER BY DATE(created_at) DESC
    LOOP
        current_date := entry_record.entry_date;
        
        IF last_date IS NULL THEN
            -- First entry
            temp_streak := 1;
            last_date := current_date;
        ELSE
            -- Calculate difference in days using EXTRACT
            date_diff := EXTRACT(DAY FROM (last_date - current_date));
            
            IF date_diff = 1 THEN
                -- Consecutive day
                temp_streak := temp_streak + 1;
            ELSIF date_diff = 0 THEN
                -- Same day, don't increment streak
                NULL;
            ELSE
                -- Gap in streak, reset
                IF temp_streak > best_streak_count THEN
                    best_streak_count := temp_streak;
                END IF;
                temp_streak := 1;
            END IF;
            last_date := current_date;
        END IF;
    END LOOP;
    
    -- Check if final streak is the best
    IF temp_streak > best_streak_count THEN
        best_streak_count := temp_streak;
    END IF;
    
    -- Calculate current streak (from today backwards)
    current_streak_count := 0;
    last_date := NULL;
    
    FOR entry_record IN 
        SELECT DATE(created_at) as entry_date
        FROM journal_entries 
        WHERE user_id = target_user_id 
        ORDER BY DATE(created_at) DESC
    LOOP
        current_date := entry_record.entry_date;
        
        IF last_date IS NULL THEN
            -- Check if most recent entry is today or yesterday
            date_diff := EXTRACT(DAY FROM (CURRENT_DATE - current_date));
            IF date_diff <= 1 THEN
                current_streak_count := 1;
                last_date := current_date;
            ELSE
                -- No current streak
                EXIT;
            END IF;
        ELSE
            date_diff := EXTRACT(DAY FROM (last_date - current_date));
            IF date_diff = 1 THEN
                current_streak_count := current_streak_count + 1;
                last_date := current_date;
            ELSE
                -- Streak broken
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    -- Update the profile with calculated streaks
    UPDATE profiles 
    SET 
        current_streak = current_streak_count,
        best_streak = best_streak_count,
        last_entry_date = (
            SELECT DATE(created_at) 
            FROM journal_entries 
            WHERE user_id = target_user_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ),
        updated_at = now()
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate update_badges_on_journal_entry function with proper type handling
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS trigger AS $$
DECLARE
    entry_count integer;
    streak_count integer;
    days_since_start integer;
BEGIN
    -- Get current stats for the user
    SELECT current_streak INTO streak_count
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Count total journal entries
    SELECT COUNT(*) INTO entry_count
    FROM journal_entries 
    WHERE user_id = NEW.user_id;
    
    -- Calculate days since first entry using EXTRACT
    SELECT EXTRACT(DAY FROM (CURRENT_DATE - DATE(MIN(created_at)))) INTO days_since_start
    FROM journal_entries 
    WHERE user_id = NEW.user_id;
    
    -- Update badge progress for entry count badges
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'first_entry', LEAST(entry_count, 1), LEAST(entry_count * 100.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(entry_count, 1),
        progress_percentage = LEAST(entry_count * 100.0, 100.0),
        earned = (entry_count >= 1),
        earned_at = CASE WHEN entry_count >= 1 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'week_warrior', LEAST(entry_count, 7), LEAST(entry_count * 100.0 / 7.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(entry_count, 7),
        progress_percentage = LEAST(entry_count * 100.0 / 7.0, 100.0),
        earned = (entry_count >= 7),
        earned_at = CASE WHEN entry_count >= 7 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'month_master', LEAST(entry_count, 30), LEAST(entry_count * 100.0 / 30.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(entry_count, 30),
        progress_percentage = LEAST(entry_count * 100.0 / 30.0, 100.0),
        earned = (entry_count >= 30),
        earned_at = CASE WHEN entry_count >= 30 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    -- Update streak badges using proper integer comparison
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'streak_starter', LEAST(streak_count, 3), LEAST(streak_count * 100.0 / 3.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(streak_count, 3),
        progress_percentage = LEAST(streak_count * 100.0 / 3.0, 100.0),
        earned = (streak_count >= 3),
        earned_at = CASE WHEN streak_count >= 3 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'consistency_champion', LEAST(streak_count, 7), LEAST(streak_count * 100.0 / 7.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(streak_count, 7),
        progress_percentage = LEAST(streak_count * 100.0 / 7.0, 100.0),
        earned = (streak_count >= 7),
        earned_at = CASE WHEN streak_count >= 7 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage)
    VALUES (NEW.user_id, 'dedication_master', LEAST(streak_count, 30), LEAST(streak_count * 100.0 / 30.0, 100.0))
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
        progress_current = LEAST(streak_count, 30),
        progress_percentage = LEAST(streak_count * 100.0 / 30.0, 100.0),
        earned = (streak_count >= 30),
        earned_at = CASE WHEN streak_count >= 30 AND NOT user_badges.earned THEN now() ELSE user_badges.earned_at END,
        updated_at = now();
    
    -- Update total badges earned count
    UPDATE profiles 
    SET total_badges_earned = (
        SELECT COUNT(*) 
        FROM user_badges 
        WHERE user_id = NEW.user_id AND earned = true
    ),
    updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate recalculate_profile_stats_on_delete function with proper type handling
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS trigger AS $$
BEGIN
    -- Recalculate streaks for the user
    PERFORM recalculate_streaks_for_user(OLD.user_id);
    
    -- Recalculate badge progress
    PERFORM update_badges_on_journal_entry() FROM journal_entries WHERE user_id = OLD.user_id LIMIT 1;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;