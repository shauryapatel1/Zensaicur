/*
  # Fix badge ID mismatch

  1. Updates
    - Fix 'first-entry' badge ID references to 'first-step' in database functions
    - Ensures consistency with seeded badge data

  2. Changes
    - Update any database functions that reference 'first-entry' to use 'first-step'
    - This resolves the foreign key constraint violation
*/

-- Update any existing user_badges records that might have the wrong badge_id
UPDATE user_badges 
SET badge_id = 'first-step' 
WHERE badge_id = 'first-entry';

-- If there are any database functions that reference 'first-entry', they need to be updated
-- Since I cannot see the exact function definition, I'll create a corrected version
-- of the refresh_user_badge_progress function that uses the correct badge IDs

CREATE OR REPLACE FUNCTION refresh_user_badge_progress(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    entry_count integer;
    current_streak integer;
    best_streak integer;
BEGIN
    -- Get user's journal entry count
    SELECT COUNT(*) INTO entry_count
    FROM journal_entries
    WHERE user_id = user_uuid;
    
    -- Get user's current and best streak
    SELECT 
        COALESCE(p.current_streak, 0),
        COALESCE(p.best_streak, 0)
    INTO current_streak, best_streak
    FROM profiles p
    WHERE p.user_id = user_uuid;
    
    -- Update or insert first-step badge (first journal entry)
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (
        user_uuid,
        'first-step',
        LEAST(entry_count, 1),
        CASE WHEN entry_count >= 1 THEN 100.0 ELSE (entry_count * 100.0) END,
        entry_count >= 1,
        CASE WHEN entry_count >= 1 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id)
    DO UPDATE SET
        progress_current = LEAST(entry_count, 1),
        progress_percentage = CASE WHEN entry_count >= 1 THEN 100.0 ELSE (entry_count * 100.0) END,
        earned = entry_count >= 1,
        earned_at = CASE 
            WHEN entry_count >= 1 AND user_badges.earned = false THEN NOW() 
            WHEN entry_count >= 1 THEN user_badges.earned_at
            ELSE NULL 
        END,
        updated_at = NOW();
    
    -- Update or insert daily-habit badge (3-day streak)
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (
        user_uuid,
        'daily-habit',
        LEAST(current_streak, 3),
        CASE WHEN current_streak >= 3 THEN 100.0 ELSE (current_streak * 100.0 / 3.0) END,
        current_streak >= 3,
        CASE WHEN current_streak >= 3 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id)
    DO UPDATE SET
        progress_current = LEAST(current_streak, 3),
        progress_percentage = CASE WHEN current_streak >= 3 THEN 100.0 ELSE (current_streak * 100.0 / 3.0) END,
        earned = current_streak >= 3,
        earned_at = CASE 
            WHEN current_streak >= 3 AND user_badges.earned = false THEN NOW() 
            WHEN current_streak >= 3 THEN user_badges.earned_at
            ELSE NULL 
        END,
        updated_at = NOW();
    
    -- Update or insert week-warrior badge (7-day streak)
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (
        user_uuid,
        'week-warrior',
        LEAST(current_streak, 7),
        CASE WHEN current_streak >= 7 THEN 100.0 ELSE (current_streak * 100.0 / 7.0) END,
        current_streak >= 7,
        CASE WHEN current_streak >= 7 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id)
    DO UPDATE SET
        progress_current = LEAST(current_streak, 7),
        progress_percentage = CASE WHEN current_streak >= 7 THEN 100.0 ELSE (current_streak * 100.0 / 7.0) END,
        earned = current_streak >= 7,
        earned_at = CASE 
            WHEN current_streak >= 7 AND user_badges.earned = false THEN NOW() 
            WHEN current_streak >= 7 THEN user_badges.earned_at
            ELSE NULL 
        END,
        updated_at = NOW();
        
END;
$$;