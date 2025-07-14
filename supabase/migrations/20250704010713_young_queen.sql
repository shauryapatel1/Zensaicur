/*
  # Fix Badge Progress Percentage Calculation

  1. Changes
    - Updates the update_badges_on_journal_entry function to explicitly calculate and set progress_percentage
    - Ensures progress_percentage is properly calculated for all badge types
    - Adds explicit percentage calculations for first-entry, entries, streaks, and monthly badges
  
  2. Reason
    - The progress_percentage field was not being properly updated in the database
    - This caused badge progress to appear incorrect in the UI
    - Fixing this ensures consistent badge progress display across the application
*/

-- Drop and recreate the badge update function with correct progress_percentage calculations
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  entry_date DATE;
  days_this_month INTEGER;
  entries_this_month INTEGER;
  progress_pct NUMERIC;
BEGIN
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
  
  -- Update badge progress for various badges
  
  -- First Entry badge - always 100% progress
  INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
  VALUES (NEW.user_id, 'first-entry', 1, 100, true, NOW())
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = 1,
    progress_percentage = 100,
    earned = true,
    earned_at = COALESCE(user_badges.earned_at, NOW());
  
  -- Entry count badges (5, 10, 25, 50, 100 entries)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries' AND id != 'first-entry'
  LOOP
    -- Calculate progress percentage
    progress_pct := LEAST(100, (total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
    
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
    WHERE badge_category = 'streaks'
  LOOP
    -- Calculate progress percentage for streak badges
    progress_pct := LEAST(100, (COALESCE(user_profile.current_streak, 0)::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
    
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
    progress_pct := LEAST(100, (entries_this_month::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
    
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
  
  -- Update total badges earned count in profile
  UPDATE profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) 
    FROM user_badges 
    WHERE user_id = NEW.user_id AND earned = true
  )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_journal_entry_badge_update ON journal_entries;
CREATE TRIGGER on_journal_entry_badge_update
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_on_journal_entry();

-- Create a function to manually refresh badge progress
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  latest_entry_date DATE;
  entries_this_month INTEGER;
  progress_pct NUMERIC;
BEGIN
  -- Get user profile
  SELECT current_streak, best_streak, last_entry_date INTO user_profile
  FROM profiles WHERE user_id = target_user_id;
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = target_user_id;
  
  -- Get latest entry date
  SELECT DATE(created_at) INTO latest_entry_date
  FROM journal_entries 
  WHERE user_id = target_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get entries this month (if there's a latest entry)
  IF latest_entry_date IS NOT NULL THEN
    SELECT COUNT(*) INTO entries_this_month
    FROM journal_entries 
    WHERE user_id = target_user_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM latest_entry_date)
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM latest_entry_date);
  ELSE
    entries_this_month := 0;
  END IF;
  
  -- First Entry badge - always 100% progress if any entries exist
  IF total_entries > 0 THEN
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (target_user_id, 'first-entry', 1, 100, true, NOW())
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = 1,
      progress_percentage = 100,
      earned = true,
      earned_at = COALESCE(user_badges.earned_at, NOW());
  END IF;
  
  -- Entry count badges
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'entries' AND id != 'first-entry'
  LOOP
    -- Calculate progress percentage
    progress_pct := LEAST(100, (total_entries::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      target_user_id, 
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
    WHERE badge_category = 'streaks'
  LOOP
    -- Calculate progress percentage for streak badges
    progress_pct := LEAST(100, (COALESCE(user_profile.current_streak, 0)::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
    
    INSERT INTO user_badges (
      user_id, 
      badge_id, 
      progress_current, 
      progress_percentage,
      earned, 
      earned_at
    )
    VALUES (
      target_user_id, 
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
  IF latest_entry_date IS NOT NULL THEN
    FOR badge_record IN 
      SELECT id, progress_target 
      FROM badges 
      WHERE badge_category = 'monthly'
    LOOP
      -- Calculate progress percentage for monthly badges
      progress_pct := LEAST(100, (entries_this_month::NUMERIC / badge_record.progress_target::NUMERIC) * 100);
      
      INSERT INTO user_badges (
        user_id, 
        badge_id, 
        progress_current, 
        progress_percentage,
        earned, 
        earned_at
      )
      VALUES (
        target_user_id, 
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
  END IF;
  
  -- Update total badges earned count in profile
  UPDATE profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) 
    FROM user_badges 
    WHERE user_id = target_user_id AND earned = true
  )
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;