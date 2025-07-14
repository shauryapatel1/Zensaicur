/*
  # Add Premium Supporter Badge Logic

  1. Changes
    - Insert or update the "Premium Supporter" badge in the badges table
    - Create a function to update badge status when subscription status changes
    - Create a trigger on profiles table to call this function when subscription_status changes
    - Update refresh_user_badge_progress to handle premium-supporter badge
  
  2. Reason
    - Automatically award the Premium Supporter badge when a user subscribes
    - Remove the badge if subscription is canceled
    - Ensure badge is properly awarded during manual refreshes
*/

-- Insert or update the Premium Supporter badge
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES (
  'premium-supporter',
  'Premium Supporter',
  'Support Zensai with a premium subscription',
  '✨',
  'special',
  'epic',
  1
)
ON CONFLICT (id) DO UPDATE SET
  badge_name = 'Premium Supporter',
  badge_description = 'Support Zensai with a premium subscription',
  badge_icon = '✨',
  badge_category = 'special',
  badge_rarity = 'epic',
  progress_target = 1;

-- Create a function to update badge status when subscription status changes
CREATE OR REPLACE FUNCTION update_badges_on_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add debug logging
  RAISE LOG 'update_badges_on_subscription_change triggered for user: %, old status: %, new status: %', 
    NEW.user_id, OLD.subscription_status, NEW.subscription_status;
  
  -- Check if subscription status changed to premium
  IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
    IF NEW.subscription_status = 'premium' THEN
      -- Award premium supporter badge
      RAISE LOG 'User % became premium, awarding premium-supporter badge', NEW.user_id;
      
      INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
      VALUES (NEW.user_id, 'premium-supporter', 1, 100, true, NOW())
      ON CONFLICT (user_id, badge_id) 
      DO UPDATE SET 
        progress_current = 1,
        progress_percentage = 100,
        earned = true,
        earned_at = COALESCE(user_badges.earned_at, NOW());
    ELSIF OLD.subscription_status = 'premium' AND NEW.subscription_status != 'premium' THEN
      -- Remove premium supporter badge if subscription was canceled
      RAISE LOG 'User % is no longer premium, removing premium-supporter badge', NEW.user_id;
      
      UPDATE user_badges
      SET earned = false,
          earned_at = NULL,
          progress_current = 0,
          progress_percentage = 0
      WHERE user_id = NEW.user_id AND badge_id = 'premium-supporter';
    END IF;
    
    -- Update total badges earned count
    UPDATE profiles 
    SET total_badges_earned = (
      SELECT COUNT(*) 
      FROM user_badges 
      WHERE user_id = NEW.user_id AND earned = true
    )
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger on profiles table to call this function when subscription_status changes
DROP TRIGGER IF EXISTS on_profile_subscription_update ON profiles;
CREATE TRIGGER on_profile_subscription_update
  AFTER UPDATE OF subscription_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_badges_on_subscription_change();

-- Update refresh_user_badge_progress to handle premium-supporter badge
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
  distinct_moods INTEGER;
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
  
  -- Get distinct moods used
  SELECT COUNT(DISTINCT mood) INTO distinct_moods
  FROM journal_entries
  WHERE user_id = p_user_id;
  
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
  
  RAISE LOG 'User % stats: entries=%, streak=%, moods=%, monthly=%, premium=%', 
    p_user_id, total_entries, COALESCE(user_profile.current_streak, 0), distinct_moods, entries_this_month, is_premium;
  
  -- First Entry badge - always 100% progress if any entries exist
  IF total_entries > 0 THEN
    INSERT INTO user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at)
    VALUES (p_user_id, 'first-entry', 1, 100, true, NOW())
    ON CONFLICT (user_id, badge_id) 
    DO UPDATE SET 
      progress_current = 1,
      progress_percentage = 100,
      earned = true,
      earned_at = COALESCE(user_badges.earned_at, NOW());
    
    RAISE LOG 'Updated first-entry badge for user %', p_user_id;
  END IF;
  
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
    p_user_id, 
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