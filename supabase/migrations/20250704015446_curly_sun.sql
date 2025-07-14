/*
  # Comprehensive Badge Update Trigger

  1. Changes
    - Recreate update_badges_on_journal_entry function with comprehensive badge logic
    - Include all badge types: first-entry, milestone/entries, streak, monthly, mood_variety
    - Add SECURITY DEFINER for proper permissions
    - Add detailed logging for better debugging
  
  2. Reason
    - Previous migration inadvertently removed some badge category logic
    - Comprehensive function ensures all badge types are properly updated
    - SECURITY DEFINER ensures the function runs with the permissions of its creator
*/

-- Drop and recreate the badge update function with comprehensive logic
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  entry_date DATE;
  entries_this_month INTEGER;
  distinct_moods INTEGER;
  progress_pct NUMERIC;
BEGIN
  -- Add debug logging
  RAISE LOG 'update_badges_on_journal_entry triggered for user: %, entry: %', NEW.user_id, NEW.id;
  
  -- Get user profile
  SELECT current_streak, best_streak INTO user_profile
  FROM profiles WHERE user_id = NEW.user_id;
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = NEW.user_id;
  
  -- Get entry date
  entry_date := DATE(NEW.created_at);
  
  -- Get entries this month
  SELECT COUNT(*) INTO entries_this_month
  FROM journal_entries 
  WHERE user_id = NEW.user_id 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM entry_date)
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM entry_date);
  
  -- Get distinct moods used
  SELECT COUNT(DISTINCT mood) INTO distinct_moods
  FROM journal_entries
  WHERE user_id = NEW.user_id;
  
  RAISE LOG 'User % stats: entries=%, streak=%, moods=%, monthly=%', 
    NEW.user_id, total_entries, COALESCE(user_profile.current_streak, 0), distinct_moods, entries_this_month;
  
  -- First Entry badge - always 100% progress
  INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
  VALUES (NEW.user_id, 'first-entry', 1, 100, true, NOW())
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = 1,
    progress_percentage = 100,
    earned = true,
    earned_at = COALESCE(user_badges.earned_at, NOW());
  
  RAISE LOG 'Updated first-entry badge for user %', NEW.user_id;
  
  -- Entry count badges (milestone/entries category)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'milestone' OR badge_category = 'entries'
  LOOP
    -- Skip first-entry badge as it's handled separately
    IF badge_record.id = 'first-entry' THEN
      CONTINUE;
    END IF;
    
    -- Calculate progress percentage
    progress_pct := LEAST(100, ROUND((total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing entry badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, total_entries, progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      total_entries,
      progress_pct,
      total_entries >= badge_record.progress_target,
      CASE WHEN total_entries >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = total_entries,
      progress_percentage = progress_pct,
      earned = total_entries >= badge_record.progress_target,
      earned_at = CASE 
        WHEN total_entries >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Streak badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'streak'
  LOOP
    -- Calculate progress percentage for streak badges
    progress_pct := LEAST(100, ROUND((COALESCE(user_profile.current_streak, 0)::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing streak badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, COALESCE(user_profile.current_streak, 0), progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      COALESCE(user_profile.current_streak, 0),
      progress_pct,
      COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      CASE WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = COALESCE(user_profile.current_streak, 0),
      progress_percentage = progress_pct,
      earned = COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target,
      earned_at = CASE 
        WHEN COALESCE(user_profile.current_streak, 0) >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Monthly badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'monthly'
  LOOP
    -- Calculate progress percentage for monthly badges
    progress_pct := LEAST(100, ROUND((entries_this_month::NUMERIC / badge_record.progress_target::NUMERIC) * 100));
    
    RAISE LOG 'Processing monthly badge: %, target: %, current: %, percentage: %', 
      badge_record.id, badge_record.progress_target, entries_this_month, progress_pct;
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      NEW.user_id, 
      badge_record.id, 
      entries_this_month,
      progress_pct,
      entries_this_month >= badge_record.progress_target,
      CASE WHEN entries_this_month >= badge_record.progress_target THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = entries_this_month,
      progress_percentage = progress_pct,
      earned = entries_this_month >= badge_record.progress_target,
      earned_at = CASE 
        WHEN entries_this_month >= badge_record.progress_target AND user_badges.earned_at IS NULL 
        THEN NOW() 
        ELSE user_badges.earned_at 
      END;
  END LOOP;
  
  -- Mood variety badge (emotional-range)
  -- Calculate progress percentage for mood variety
  progress_pct := LEAST(100, ROUND((distinct_moods::NUMERIC / 5::NUMERIC) * 100));
  
  RAISE LOG 'Processing mood variety badge: emotional-range, target: 5, current: %, percentage: %', 
    distinct_moods, progress_pct;
  
  INSERT INTO user_badges (
    user_id, 
    badge_id, 
    progress_current, 
    progress_percentage,
    earned, 
    earned_at
  )
  VALUES (
    NEW.user_id, 
    'emotional-range', 
    distinct_moods,
    progress_pct,
    distinct_moods >= 5,
    CASE WHEN distinct_moods >= 5 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = distinct_moods,
    progress_percentage = progress_pct,
    earned = distinct_moods >= 5,
    earned_at = CASE 
      WHEN distinct_moods >= 5 AND user_badges.earned_at IS NULL 
      THEN NOW() 
      ELSE user_badges.earned_at 
    END;
  
  -- Update total badges earned count in profile
  UPDATE profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) 
    FROM user_badges 
    WHERE user_id = NEW.user_id AND earned = true
  )
  WHERE user_id = NEW.user_id;
  
  RAISE LOG 'Updated total badges earned for user %', NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_journal_entry_badge_update ON journal_entries;
CREATE TRIGGER on_journal_entry_badge_update
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_on_journal_entry();