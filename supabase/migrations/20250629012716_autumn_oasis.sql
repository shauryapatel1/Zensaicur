/*
  # Fix badge progress RPC function

  1. Functions
    - Drop existing refresh_user_badge_progress function if it exists
    - Create new refresh_user_badge_progress function that works with current schema
    - Create get_user_badge_progress function if it doesn't exist

  2. Security
    - Functions are accessible to authenticated users only
    - Users can only refresh their own badge progress

  3. Notes
    - This fixes the "column badge_category does not exist" error
    - Ensures badge progress calculations work correctly with current schema
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS refresh_user_badge_progress(uuid);
DROP FUNCTION IF EXISTS get_user_badge_progress(uuid);

-- Create function to refresh user badge progress
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function triggers badge progress recalculation
  -- by calling the existing trigger functions
  
  -- Update user badges progress based on current journal entries
  INSERT INTO user_badges (user_id, badge_id, progress_current)
  SELECT 
    target_user_id,
    b.id,
    CASE 
      WHEN b.id = 'first_entry' THEN 
        LEAST((SELECT COUNT(*) FROM journal_entries WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'streak_3' THEN 
        LEAST((SELECT COALESCE(current_streak, 0) FROM profiles WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'streak_7' THEN 
        LEAST((SELECT COALESCE(current_streak, 0) FROM profiles WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'streak_30' THEN 
        LEAST((SELECT COALESCE(current_streak, 0) FROM profiles WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'entries_10' THEN 
        LEAST((SELECT COUNT(*) FROM journal_entries WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'entries_50' THEN 
        LEAST((SELECT COUNT(*) FROM journal_entries WHERE user_id = target_user_id), b.progress_target)
      WHEN b.id = 'entries_100' THEN 
        LEAST((SELECT COUNT(*) FROM journal_entries WHERE user_id = target_user_id), b.progress_target)
      ELSE 0
    END
  FROM badges b
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = EXCLUDED.progress_current,
    earned = (EXCLUDED.progress_current >= (SELECT progress_target FROM badges WHERE id = EXCLUDED.badge_id)),
    earned_at = CASE 
      WHEN EXCLUDED.progress_current >= (SELECT progress_target FROM badges WHERE id = EXCLUDED.badge_id) 
        AND user_badges.earned = false 
      THEN now() 
      ELSE user_badges.earned_at 
    END,
    updated_at = now();
END;
$$;

-- Create function to get user badge progress with all required fields
CREATE OR REPLACE FUNCTION get_user_badge_progress(target_user_id uuid)
RETURNS TABLE (
  id text,
  badge_name text,
  badge_description text,
  badge_icon text,
  badge_category text,
  badge_rarity text,
  earned boolean,
  earned_at timestamptz,
  progress_current integer,
  progress_target integer,
  progress_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.badge_name,
    b.badge_description,
    b.badge_icon,
    b.badge_category,
    b.badge_rarity,
    COALESCE(ub.earned, false) as earned,
    ub.earned_at,
    COALESCE(ub.progress_current, 0) as progress_current,
    b.progress_target,
    ROUND(
      (COALESCE(ub.progress_current, 0)::numeric / b.progress_target::numeric) * 100, 
      2
    ) as progress_percentage
  FROM badges b
  LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = target_user_id
  ORDER BY 
    CASE b.badge_rarity 
      WHEN 'legendary' THEN 1
      WHEN 'epic' THEN 2  
      WHEN 'rare' THEN 3
      ELSE 4
    END,
    b.badge_name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION refresh_user_badge_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_badge_progress(uuid) TO authenticated;