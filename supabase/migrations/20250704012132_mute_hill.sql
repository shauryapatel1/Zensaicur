/*
  # Fix ambiguous badge_id column reference in refresh_user_badge_progress function

  1. Function Updates
    - Update `refresh_user_badge_progress` function to properly qualify badge_id column references
    - Add proper table aliases to avoid ambiguity between badges.id and user_badges.badge_id

  2. Security
    - Maintain existing function security and permissions
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS refresh_user_badge_progress(uuid);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update progress for all user badges based on current journal entries and badge criteria
  UPDATE user_badges ub
  SET 
    progress_current = CASE 
      WHEN b.badge_category = 'streak' THEN 
        COALESCE((SELECT current_streak FROM profiles WHERE user_id = p_user_id), 0)
      WHEN b.badge_category = 'entries' THEN 
        COALESCE((SELECT COUNT(*) FROM journal_entries WHERE user_id = p_user_id), 0)
      WHEN b.badge_category = 'mood_variety' THEN 
        COALESCE((SELECT COUNT(DISTINCT mood) FROM journal_entries WHERE user_id = p_user_id), 0)
      WHEN b.badge_category = 'consistency' THEN 
        COALESCE((SELECT best_streak FROM profiles WHERE user_id = p_user_id), 0)
      ELSE ub.progress_current
    END,
    progress_percentage = CASE 
      WHEN b.progress_target > 0 THEN 
        LEAST(100, (CASE 
          WHEN b.badge_category = 'streak' THEN 
            COALESCE((SELECT current_streak FROM profiles WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'entries' THEN 
            COALESCE((SELECT COUNT(*) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'mood_variety' THEN 
            COALESCE((SELECT COUNT(DISTINCT mood) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'consistency' THEN 
            COALESCE((SELECT best_streak FROM profiles WHERE user_id = p_user_id), 0)
          ELSE ub.progress_current
        END * 100.0 / b.progress_target))
      ELSE 0
    END,
    earned = CASE 
      WHEN b.progress_target > 0 THEN 
        (CASE 
          WHEN b.badge_category = 'streak' THEN 
            COALESCE((SELECT current_streak FROM profiles WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'entries' THEN 
            COALESCE((SELECT COUNT(*) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'mood_variety' THEN 
            COALESCE((SELECT COUNT(DISTINCT mood) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'consistency' THEN 
            COALESCE((SELECT best_streak FROM profiles WHERE user_id = p_user_id), 0)
          ELSE ub.progress_current
        END >= b.progress_target)
      ELSE false
    END,
    earned_at = CASE 
      WHEN NOT ub.earned AND b.progress_target > 0 AND 
        (CASE 
          WHEN b.badge_category = 'streak' THEN 
            COALESCE((SELECT current_streak FROM profiles WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'entries' THEN 
            COALESCE((SELECT COUNT(*) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'mood_variety' THEN 
            COALESCE((SELECT COUNT(DISTINCT mood) FROM journal_entries WHERE user_id = p_user_id), 0)
          WHEN b.badge_category = 'consistency' THEN 
            COALESCE((SELECT best_streak FROM profiles WHERE user_id = p_user_id), 0)
          ELSE ub.progress_current
        END >= b.progress_target) THEN now()
      ELSE ub.earned_at
    END,
    updated_at = now()
  FROM badges b
  WHERE ub.badge_id = b.id 
    AND ub.user_id = p_user_id;

  -- Update total badges earned in profiles
  UPDATE profiles 
  SET 
    total_badges_earned = (
      SELECT COUNT(*) 
      FROM user_badges ub2 
      WHERE ub2.user_id = p_user_id AND ub2.earned = true
    ),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;