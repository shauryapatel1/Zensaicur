/*
  # Fix get_user_badge_progress function

  1. Changes
    - Fixes the get_user_badge_progress function by correcting column references
    - Changes b.badge_id to ub.badge_id where appropriate
  
  2. Reason
    - The function was failing with error "column b.badge_id does not exist"
    - This was causing badge progress tracking to fail
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_user_badge_progress;

-- Recreate the function with the correct column references
CREATE OR REPLACE FUNCTION get_user_badge_progress(target_user_id UUID)
RETURNS TABLE (
  id TEXT,
  badge_name TEXT,
  badge_description TEXT,
  badge_icon TEXT,
  badge_category TEXT,
  badge_rarity TEXT,
  earned BOOLEAN,
  earned_at TIMESTAMP WITH TIME ZONE,
  progress_current INTEGER,
  progress_target INTEGER,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.badge_name,
    b.badge_description,
    b.badge_icon,
    b.badge_category,
    b.badge_rarity,
    COALESCE(ub.earned, FALSE) AS earned,
    ub.earned_at,
    COALESCE(ub.progress_current, 0) AS progress_current,
    b.progress_target,
    COALESCE(ub.progress_percentage, 0) AS progress_percentage
  FROM
    badges b
  LEFT JOIN
    user_badges ub ON ub.badge_id = b.id AND ub.user_id = target_user_id
  ORDER BY
    COALESCE(ub.earned, FALSE) DESC,
    b.badge_rarity DESC,
    b.badge_name ASC;
END;
$$ LANGUAGE plpgsql;