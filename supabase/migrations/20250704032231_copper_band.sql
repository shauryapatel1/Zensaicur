/*
  # Fix Badge ID References in Database Functions

  1. Changes
    - Update all database functions to use consistent badge IDs
    - Replace 'first-entry' references with 'first-step'
    - Fix other badge ID references to match the actual badge IDs in the database
  
  2. Reason
    - The refresh_user_badge_progress function is trying to reference a badge with ID 'first-entry'
    - The actual badge ID in the database is 'first-step'
    - This mismatch causes foreign key constraint violations
*/

-- Create a new version of refresh_user_badge_progress with correct badge IDs
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  total_entries INTEGER;
  latest_entry_date DATE;
  entries_this_month INTEGER;
  is_premium BOOLEAN;
  progress_pct NUMERIC;
  badge_count INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'refresh_user_badge_progress called for user: %', p_user_id;
  
  -- Get user profile
  SELECT 
    current_streak, 
    best_streak, 
    last_entry_date,
    subscription_status = 'premium' AS is_premium
  INTO user_profile
  FROM profiles 
  WHERE user_id = p_user_id;
  
  -- Store premium status for easier access
  is_premium := COALESCE(user_profile.is_premium, false);
  
  -- Get total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries WHERE user_id = p_user_id;
  
  -- Get latest entry date
  SELECT DATE(created_at) INTO latest_entry_date
  FROM journal_entries 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get entries this month (if there's a latest entry)
  IF latest_entry_date IS NOT NULL THEN
    SELECT COUNT(*) INTO entries_this_month
    FROM journal_entries 
    WHERE user_id = p_user_id 
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM latest_entry_date)
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM latest_entry_date);
  ELSE
    entries_this_month := 0;
  END IF;
  
  RAISE LOG 'User % stats: entries=%, streak=%, monthly=%, premium=%', 
    p_user_id, total_entries, COALESCE(user_profile.current_streak, 0), entries_this_month, is_premium;
  
  -- First Step badge - always 100% progress if any entries exist
  IF total_entries > 0 THEN
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (p_user_id, 'first-step', 1, 100, true, NOW())
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = 1,
      progress_percentage = 100,
      earned = true,
      earned_at = COALESCE(user_badges.earned_at, NOW());
    
    RAISE LOG 'Updated first-step badge for user %', p_user_id;
  END IF;
  
  -- Entry count badges (milestone/entries category)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'milestone' OR badge_category = 'entries'
  LOOP
    -- Skip first-step badge as it's handled separately
    IF badge_record.id = 'first-step' THEN
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
      p_user_id, 
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
      p_user_id, 
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
        p_user_id, 
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
  
  -- Premium Supporter badge
  RAISE LOG 'Processing premium supporter badge for user %, is_premium: %', p_user_id, is_premium;
  
  INSERT INTO user_badges (
    user_id, 
    badge_id, 
    progress_current, 
    progress_percentage,
    earned, 
    earned_at
  )
  VALUES (
    p_user_id, 
    'premium-supporter', 
    CASE WHEN is_premium THEN 1 ELSE 0 END,
    CASE WHEN is_premium THEN 100 ELSE 0 END,
    is_premium,
    CASE WHEN is_premium THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = CASE WHEN is_premium THEN 1 ELSE 0 END,
    progress_percentage = CASE WHEN is_premium THEN 100 ELSE 0 END,
    earned = is_premium,
    earned_at = CASE 
      WHEN is_premium AND user_badges.earned_at IS NULL THEN NOW() 
      WHEN NOT is_premium THEN NULL
      ELSE user_badges.earned_at 
    END;
  
  -- Update total badges earned count in profile
  SELECT COUNT(*) INTO badge_count
  FROM user_badges 
  WHERE user_id = p_user_id AND earned = true;
  
  UPDATE profiles 
  SET total_badges_earned = badge_count
  WHERE user_id = p_user_id;
  
  RAISE LOG 'Updated total_badges_earned for user % to %', p_user_id, badge_count;
END;
$$;

-- Update the update_badges_on_journal_entry function to use correct badge IDs
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
  
  RAISE LOG 'User % stats: entries=%, streak=%, monthly=%', 
    NEW.user_id, total_entries, COALESCE(user_profile.current_streak, 0), entries_this_month;
  
  -- First Step badge - always 100% progress
  INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
  VALUES (NEW.user_id, 'first-step', 1, 100, true, NOW())
  ON CONFLICT (user_id, badge_id) 
  DO UPDATE SET 
    progress_current = 1,
    progress_percentage = 100,
    earned = true,
    earned_at = COALESCE(user_badges.earned_at, NOW());
  
  RAISE LOG 'Updated first-step badge for user %', NEW.user_id;
  
  -- Entry count badges (milestone/entries category)
  FOR badge_record IN 
    SELECT id, progress_target 
    FROM badges 
    WHERE badge_category = 'milestone' OR badge_category = 'entries'
  LOOP
    -- Skip first-step badge as it's handled separately
    IF badge_record.id = 'first-step' THEN
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

-- Update the recalculate_profile_stats_on_delete function to use correct badge IDs
CREATE OR REPLACE FUNCTION recalculate_profile_stats_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  total_entries INTEGER;
  badge_record RECORD;
  progress_pct NUMERIC;
BEGIN
  -- Count total entries for this user
  SELECT COUNT(*) INTO total_entries
  FROM journal_entries
  WHERE user_id = OLD.user_id;
  
  -- Update entry count badges
  FOR badge_record IN 
    SELECT id, progress_target
    FROM badges
    WHERE badge_category = 'milestone' AND id != 'first-step'
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

-- Ensure the first-step badge exists
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES (
  'first-step',
  'First Step',
  'Complete your very first journal entry',
  '🌱',
  'milestone',
  'common',
  1
)
ON CONFLICT (id) DO UPDATE SET
  badge_name = 'First Step',
  badge_description = 'Complete your very first journal entry',
  badge_icon = '🌱',
  badge_category = 'milestone',
  badge_rarity = 'common',
  progress_target = 1;

-- Update any existing user_badges that might have the wrong badge_id
UPDATE user_badges
SET badge_id = 'first-step'
WHERE badge_id = 'first-entry';