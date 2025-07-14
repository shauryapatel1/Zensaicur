/*
  # Update recalculate_profile_stats_on_delete function
  
  1. Changes
    - Remove references to 'emotional-range' badge
    - Properly handle dependencies by dropping the trigger first
  
  2. Reason
    - To remove the badges that are no longer needed
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_journal_entry_delete ON journal_entries;

-- Then drop the existing function
DROP FUNCTION IF EXISTS recalculate_profile_stats_on_delete();

-- Recreate the function without the emotional-range badge logic
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  total_entries INTEGER;
  distinct_moods INTEGER;
  badge_record RECORD;
  progress_pct NUMERIC;
BEGIN
  -- Count total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  -- Count distinct moods used by this user
  SELECT COUNT(DISTINCT mood) INTO distinct_moods
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  -- Update entry count badges
  FOR badge_record IN 
    SELECT id, progress_target
    FROM badges
    WHERE badge_category = 'milestone' AND id != 'first-entry'
  LOOP
    -- Calculate progress percentage
    progress_pct := LEAST(100, ROUND((total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Updating entry count badge after deletion: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, total_entries, progress_pct;
    
    UPDATE user_badges
    SET progress_current = total_entries,
        progress_percentage = progress_pct,
        earned = total_entries >= badge_record.progress_target,
        earned_at = CASE 
          WHEN total_entries >= badge_record.progress_target AND earned_at IS NULL THEN NOW() 
          WHEN total_entries < badge_record.progress_target THEN NULL
          ELSE earned_at 
        END
    WHERE user_id = OLD.user_id AND badge_id = badge_record.id;
  END LOOP;
  
  -- Update monthly badges
  FOR badge_record IN 
    SELECT id, progress_target
    FROM badges
    WHERE badge_category = 'monthly'
  LOOP
    -- Count entries in the current month
    WITH monthly_count AS (
      SELECT COUNT(*) as count
      FROM journal_entries
      WHERE user_id = OLD.user_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    )
    
    UPDATE user_badges ub
    SET progress_current = mc.count,
        progress_percentage = LEAST(100, ROUND((mc.count::NUMERIC / badge_record.progress_target::NUMERIC) * 100)),
        earned = mc.count >= badge_record.progress_target,
        earned_at = CASE 
          WHEN mc.count >= badge_record.progress_target AND ub.earned_at IS NULL THEN NOW() 
          WHEN mc.count < badge_record.progress_target THEN NULL
          ELSE ub.earned_at 
        END
    FROM monthly_count mc
    WHERE ub.user_id = OLD.user_id AND ub.badge_id = badge_record.id;
  END LOOP;
  
  -- Update profile stats
  UPDATE profiles
  SET total_badges_earned = (
    SELECT COUNT(*)
    FROM user_badges
    WHERE user_id = OLD.user_id AND earned = TRUE
  )
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_journal_entry_delete
AFTER DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION recalculate_profile_stats_on_delete();