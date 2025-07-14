/*
  # Fix ambiguous badge_id reference

  1. Changes
    - Updates the update_badges_on_journal_entry function to use fully qualified column references
    - Fixes the "column reference badge_id is ambiguous" error that occurs when adding journal entries
  
  2. Reason
    - The function was referencing badge_id without specifying which table it belongs to
    - This caused ambiguity when the query joined multiple tables that both have badge_id columns
*/

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_journal_entry_badge_update ON journal_entries;

-- Then recreate the function with fixed column references
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Update milestone badges (entry count badges)
  UPDATE user_badges ub
  SET 
    progress_current = COALESCE(
      (SELECT COUNT(*) FROM journal_entries WHERE user_id = NEW.user_id),
      0
    ),
    progress_percentage = LEAST(
      ROUND(
        COALESCE(
          (SELECT COUNT(*) FROM journal_entries WHERE user_id = NEW.user_id),
          0
        ) * 100.0 / b.progress_target
      ),
      100
    ),
    earned = CASE WHEN 
      COALESCE(
        (SELECT COUNT(*) FROM journal_entries WHERE user_id = NEW.user_id),
        0
      ) >= b.progress_target 
      THEN TRUE ELSE FALSE END,
    earned_at = CASE WHEN 
      COALESCE(
        (SELECT COUNT(*) FROM journal_entries WHERE user_id = NEW.user_id),
        0
      ) >= b.progress_target AND ub.earned = FALSE
      THEN NOW() ELSE ub.earned_at END
  FROM badges b
  WHERE b.badge_category = 'milestone'
    AND ub.badge_id = b.id
    AND ub.user_id = NEW.user_id;

  -- Update mood variety badges (using all 5 different moods)
  WITH user_moods AS (
    SELECT DISTINCT mood
    FROM journal_entries
    WHERE user_id = NEW.user_id
  )
  UPDATE user_badges ub
  SET 
    progress_current = (SELECT COUNT(*) FROM user_moods),
    progress_percentage = LEAST(
      ROUND((SELECT COUNT(*) FROM user_moods) * 100.0 / b.progress_target),
      100
    ),
    earned = CASE WHEN (SELECT COUNT(*) FROM user_moods) >= b.progress_target THEN TRUE ELSE FALSE END,
    earned_at = CASE WHEN 
      (SELECT COUNT(*) FROM user_moods) >= b.progress_target AND ub.earned = FALSE
      THEN NOW() ELSE ub.earned_at END
  FROM badges b
  WHERE b.id = 'emotional-range'
    AND ub.badge_id = b.id
    AND ub.user_id = NEW.user_id;

  -- Update profile stats
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*) FROM user_badges 
      WHERE user_id = NEW.user_id AND earned = TRUE
    )
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_journal_entry_badge_update
AFTER INSERT ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_badges_on_journal_entry();