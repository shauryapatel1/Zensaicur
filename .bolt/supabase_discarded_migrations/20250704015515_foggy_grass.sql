/*
  # Update Delete Function

  1. Changes
    - Add SECURITY DEFINER to recalculate_profile_stats_on_delete function
    - Add detailed logging for better debugging
    - Fix badge progress recalculation after entry deletion
  
  2. Reason
    - SECURITY DEFINER ensures the function runs with the permissions of its creator
    - Logging helps track deletion and recalculation issues
    - Proper badge progress recalculation ensures accurate stats after deletion
*/

-- Drop and recreate the profile stats recalculation function for deletions
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFIFIER
AS $$
DECLARE
  user_profile RECORD;
  latest_entry RECORD;
  entry_count INTEGER;
  badge_count INTEGER;
  distinct_moods INTEGER;
  entries_this_month INTEGER;
  latest_entry_date DATE;
  badge_record RECORD;
  progress_pct NUMERIC;
BEGIN
  -- Add debug logging
  RAISE LOG 'recalculate_profile_stats_on_delete triggered for user: %, deleted entry: %', OLD.user_id, OLD.id;
  
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries WHERE user_id = OLD.user_id;
  
  RAISE LOG 'User % has % entries remaining after deletion', OLD.user_id, entry_count;
  
  -- If no entries left, reset everything
  IF entry_count = 0 THEN
    RAISE LOG 'No entries left for user %, resetting profile', OLD.user_id;
    UPDATE profiles 
    SET current_streak = 0,
        best_streak = 0,
        last_entry_date = NULL,
        total_badges_earned = 0
    WHERE user_id = OLD.user_id;
    
    -- Reset all badges
    UPDATE user_badges
    SET progress_current = 0,
        progress_percentage = 0,
        earned = false,
        earned_at = NULL
    WHERE user_id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  -- Get the latest entry date
  SELECT DATE(created_at) INTO latest_entry_date
  FROM journal_entries 
  WHERE user_id = OLD.user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get distinct moods used
  SELECT COUNT(DISTINCT mood) INTO distinct_moods
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  -- Get entries this month (if there's a latest entry)
  IF latest_entry_date IS NOT NULL THEN
    SELECT COUNT(*) INTO entries_this_month
    FROM journal_entries 
    WHERE user_id = OLD.user_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM latest_entry_date)
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM latest_entry_date);
  ELSE
    entries_this_month := 0;
  END IF;
  
  -- Update profile with latest entry date
  UPDATE profiles 
  SET last_entry_date = latest_entry_date
  WHERE user_id = OLD.user_id;
  
  -- Update badge progress for entry count badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'milestone' OR badge_category = 'entries'
  LOOP
    -- Skip first-entry badge if there are still entries
    IF badge_record.id = 'first-entry' AND entry_count > 0 THEN
      CONTINUE;
    END IF;
    
    -- Calculate progress percentage
    progress_pct := LEAST(100, ROUND((entry_count::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Updating entry badge after deletion: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, entry_count, progress_pct;
    
    UPDATE user_badges
    SET progress_current = entry_count,
        progress_percentage = progress_pct,
        earned = entry_count >= badge_record.progress_target,
        earned_at = CASE 
          WHEN entry_count >= badge_record.progress_target AND earned_at IS NULL THEN NOW() 
          WHEN entry_count < badge_record.progress_target THEN NULL
          ELSE earned_at 
        END
    WHERE user_id = OLD.user_id AND badge_id = badge_record.id;
  END LOOP;
  
  -- Update mood variety badge (emotional-range)
  -- Calculate progress percentage for mood variety
  progress_pct := LEAST(100, ROUND((distinct_moods::NUMERIC / 5::NUMERIC) * 100));
  
  RAISE LOG 'Updating mood variety badge after deletion: emotional-range, target: 5, current: %, percentage: %', 
    distinct_moods, progress_pct;
  
  UPDATE user_badges
  SET progress_current = distinct_moods,
      progress_percentage = progress_pct,
      earned = distinct_moods >= 5,
      earned_at = CASE 
        WHEN distinct_moods >= 5 AND earned_at IS NULL THEN NOW() 
        WHEN distinct_moods < 5 THEN NULL
        ELSE earned_at 
      END
  WHERE user_id = OLD.user_id AND badge_id = 'emotional-range';
  
  -- Update monthly badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'monthly'
  LOOP
    -- Calculate progress percentage for monthly badges
    progress_pct := LEAST(100, ROUND((entries_this_month::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Updating monthly badge after deletion: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, entries_this_month, progress_pct;
    
    UPDATE user_badges
    SET progress_current = entries_this_month,
        progress_percentage = progress_pct,
        earned = entries_this_month >= badge_record.progress_target,
        earned_at = CASE 
          WHEN entries_this_month >= badge_record.progress_target AND earned_at IS NULL THEN NOW() 
          WHEN entries_this_month < badge_record.progress_target THEN NULL
          ELSE earned_at 
        END
    WHERE user_id = OLD.user_id AND badge_id = badge_record.id;
  END LOOP;
  
  -- Update total badges earned count in profile
  SELECT COUNT(*) INTO badge_count
  FROM user_badges 
  WHERE user_id = OLD.user_id AND earned = true;
  
  UPDATE profiles 
  SET total_badges_earned = badge_count
  WHERE user_id = OLD.user_id;
  
  RAISE LOG 'Updated total_badges_earned for user % to % after deletion', OLD.user_id, badge_count;
  
  RETURN OLD;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_journal_entry_delete ON journal_entries;
CREATE TRIGGER on_journal_entry_delete
  AFTER DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_profile_stats_on_delete();