/*
  # Fix Badge Progress Update

  1. Changes
    - Add SECURITY DEFINER to trigger functions
    - Add RAISE LOG statements for debugging
    - Create a manual refresh function for badge progress
  
  2. Reason
    - Trigger functions need SECURITY DEFINER to execute with proper privileges
    - Logging helps identify when triggers are firing
    - Manual refresh function provides a fallback mechanism
*/

-- Recreate update_badges_on_journal_entry function with SECURITY DEFINER and logging
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  entry_count INTEGER;
  streak_count INTEGER;
  mood_variety INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'Badge update trigger fired for user: %', NEW.user_id;
  
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE profiles.user_id = NEW.user_id;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE journal_entries.user_id = NEW.user_id;
  
  RAISE LOG 'User % has % total entries', NEW.user_id, entry_count;
  
  -- Get current streak
  streak_count := COALESCE(user_profile.current_streak, 0);
  
  -- Get mood variety (count of distinct moods used)
  SELECT COUNT(DISTINCT journal_entries.mood) INTO mood_variety
  FROM journal_entries
  WHERE journal_entries.user_id = NEW.user_id;
  
  -- Process each badge
  FOR badge_record IN 
    SELECT 
      badges.id, 
      badges.badge_category,
      badges.progress_target
    FROM badges
  LOOP
    BEGIN
      -- Check if user already has this badge
      IF NOT EXISTS (
        SELECT 1 FROM user_badges 
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
      ) THEN
        -- Create new badge record for user if it doesn't exist
        INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
        VALUES (NEW.user_id, badge_record.id, 0, false);
        
        RAISE LOG 'Created new badge record for user % and badge %', NEW.user_id, badge_record.id;
      END IF;
      
      -- Update progress based on badge category
      IF badge_record.badge_category = 'milestone' THEN
        -- Update entry count badges
        UPDATE user_badges
        SET progress_current = entry_count
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> entry_count);
        
        RAISE LOG 'Updated milestone badge % progress to % for user %', 
          badge_record.id, entry_count, NEW.user_id;
        
      ELSIF badge_record.badge_category = 'streak' THEN
        -- Update streak badges
        UPDATE user_badges
        SET progress_current = streak_count
        WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
        AND (user_badges.earned = false OR user_badges.progress_current <> streak_count);
        
        RAISE LOG 'Updated streak badge % progress to % for user %', 
          badge_record.id, streak_count, NEW.user_id;
        
      ELSIF badge_record.badge_category = 'achievement' THEN
        -- Handle different achievement types
        IF badge_record.id = 'first-entry' THEN
          -- First entry badge
          UPDATE user_badges
          SET progress_current = 1
          WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
          AND user_badges.earned = false;
          
          RAISE LOG 'Updated first-entry badge progress for user %', NEW.user_id;
          
        ELSIF badge_record.id = 'best-streak-7' THEN
          -- Best streak achievement
          UPDATE user_badges
          SET progress_current = LEAST(user_profile.best_streak, badge_record.progress_target)
          WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
          AND (user_badges.earned = false OR user_badges.progress_current <> LEAST(user_profile.best_streak, badge_record.progress_target));
          
          RAISE LOG 'Updated best-streak badge progress to % for user %', 
            LEAST(user_profile.best_streak, badge_record.progress_target), NEW.user_id;
          
        ELSIF badge_record.id = 'mood-variety' THEN
          -- Mood variety badge
          UPDATE user_badges
          SET progress_current = mood_variety
          WHERE user_badges.user_id = NEW.user_id AND user_badges.badge_id = badge_record.id
          AND (user_badges.earned = false OR user_badges.progress_current <> mood_variety);
          
          RAISE LOG 'Updated mood-variety badge progress to % for user %', 
            mood_variety, NEW.user_id;
        END IF;
      END IF;
      
      -- Check if badge should be earned now
      UPDATE user_badges
      SET 
        earned = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target THEN true 
          ELSE user_badges.earned 
        END,
        earned_at = CASE 
          WHEN user_badges.progress_current >= badge_record.progress_target AND user_badges.earned = false THEN NOW() 
          ELSE user_badges.earned_at 
        END,
        updated_at = NOW()
      WHERE 
        user_badges.user_id = NEW.user_id AND 
        user_badges.badge_id = badge_record.id AND
        user_badges.earned = false AND
        user_badges.progress_current >= badge_record.progress_target;
        
      IF FOUND THEN
        RAISE LOG 'User % earned badge %!', NEW.user_id, badge_record.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue with next badge
        RAISE LOG 'Error updating badge %: %', badge_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Update total badges earned in profile
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_badges.user_id = NEW.user_id AND user_badges.earned = true
    ),
    updated_at = NOW()
  WHERE profiles.user_id = NEW.user_id;
  
  RAISE LOG 'Badge progress updated for user: %', NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NEW to allow the transaction to complete
    RAISE LOG 'Error in update_badges_on_journal_entry: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate update_profile_on_journal_entry function with SECURITY DEFINER and logging
CREATE OR REPLACE FUNCTION update_profile_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  days_since_last_entry INTEGER;
  new_streak INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'Profile update trigger fired for user: %', NEW.user_id;
  
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE profiles.user_id = NEW.user_id;
  
  -- Calculate days since last entry
  IF user_profile.last_entry_date IS NULL THEN
    days_since_last_entry := 0;
  ELSE
    days_since_last_entry := EXTRACT(DAY FROM (CURRENT_DATE - user_profile.last_entry_date));
  END IF;
  
  -- Calculate new streak
  IF days_since_last_entry <= 1 THEN
    -- Continue or start streak
    IF CURRENT_DATE > user_profile.last_entry_date OR user_profile.last_entry_date IS NULL THEN
      new_streak := COALESCE(user_profile.current_streak, 0) + 1;
    ELSE
      -- Same day entry, keep current streak
      new_streak := COALESCE(user_profile.current_streak, 0);
    END IF;
  ELSE
    -- Streak broken, start new streak
    new_streak := 1;
  END IF;
  
  RAISE LOG 'Updating streak for user % from % to %', 
    NEW.user_id, user_profile.current_streak, new_streak;
  
  -- Update the profile with new streak information
  UPDATE profiles 
  SET 
    current_streak = new_streak,
    best_streak = GREATEST(COALESCE(profiles.best_streak, 0), new_streak),
    last_entry_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE profiles.user_id = NEW.user_id;
  
  RAISE LOG 'Profile updated for user: %', NEW.user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NEW to allow the transaction to complete
    RAISE LOG 'Error in update_profile_on_journal_entry: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a manual refresh function for badge progress
CREATE OR REPLACE FUNCTION refresh_user_badge_progress(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  entry_count INTEGER;
  streak_count INTEGER;
  best_streak INTEGER;
  mood_variety INTEGER;
BEGIN
  -- Add debug logging
  RAISE LOG 'Manual badge refresh requested for user: %', target_user_id;
  
  -- Get current entry count
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries 
  WHERE user_id = target_user_id;
  
  -- Get current streak and best streak
  SELECT current_streak, best_streak INTO streak_count, best_streak
  FROM profiles
  WHERE user_id = target_user_id;
  
  -- Get mood variety
  SELECT COUNT(DISTINCT mood) INTO mood_variety
  FROM journal_entries
  WHERE user_id = target_user_id;
  
  RAISE LOG 'User % stats: % entries, streak: %, best: %, moods: %', 
    target_user_id, entry_count, streak_count, best_streak, mood_variety;
  
  -- Update milestone badges (based on entry count)
  UPDATE user_badges
  SET 
    progress_current = entry_count,
    earned = (entry_count >= (SELECT progress_target FROM badges WHERE id = badge_id)),
    earned_at = CASE 
      WHEN entry_count >= (SELECT progress_target FROM badges WHERE id = badge_id) AND earned = false 
      THEN NOW() 
      ELSE earned_at 
    END,
    updated_at = NOW()
  WHERE 
    user_id = target_user_id AND
    badge_id IN (SELECT id FROM badges WHERE badge_category = 'milestone');
    
  RAISE LOG 'Updated milestone badges for user %', target_user_id;
  
  -- Update streak badges
  UPDATE user_badges
  SET 
    progress_current = streak_count,
    earned = (streak_count >= (SELECT progress_target FROM badges WHERE id = badge_id)),
    earned_at = CASE 
      WHEN streak_count >= (SELECT progress_target FROM badges WHERE id = badge_id) AND earned = false 
      THEN NOW() 
      ELSE earned_at 
    END,
    updated_at = NOW()
  WHERE 
    user_id = target_user_id AND
    badge_id IN (SELECT id FROM badges WHERE badge_category = 'streak');
    
  RAISE LOG 'Updated streak badges for user %', target_user_id;
  
  -- Update achievement badges
  
  -- First entry badge
  UPDATE user_badges
  SET 
    progress_current = CASE WHEN entry_count > 0 THEN 1 ELSE 0 END,
    earned = (entry_count > 0),
    earned_at = CASE 
      WHEN entry_count > 0 AND earned = false 
      THEN NOW() 
      ELSE earned_at 
    END,
    updated_at = NOW()
  WHERE 
    user_id = target_user_id AND
    badge_id = 'first-entry';
    
  -- Best streak badge
  UPDATE user_badges
  SET 
    progress_current = LEAST(best_streak, (SELECT progress_target FROM badges WHERE id = badge_id)),
    earned = (best_streak >= (SELECT progress_target FROM badges WHERE id = badge_id)),
    earned_at = CASE 
      WHEN best_streak >= (SELECT progress_target FROM badges WHERE id = badge_id) AND earned = false 
      THEN NOW() 
      ELSE earned_at 
    END,
    updated_at = NOW()
  WHERE 
    user_id = target_user_id AND
    badge_id = 'best-streak-7';
    
  -- Mood variety badge
  UPDATE user_badges
  SET 
    progress_current = mood_variety,
    earned = (mood_variety >= (SELECT progress_target FROM badges WHERE id = badge_id)),
    earned_at = CASE 
      WHEN mood_variety >= (SELECT progress_target FROM badges WHERE id = badge_id) AND earned = false 
      THEN NOW() 
      ELSE earned_at 
    END,
    updated_at = NOW()
  WHERE 
    user_id = target_user_id AND
    badge_id = 'mood-variety';
    
  RAISE LOG 'Updated achievement badges for user %', target_user_id;
  
  -- Update total badges earned count
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_id = target_user_id AND earned = true
    ),
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RAISE LOG 'Refreshed badge progress for user % with % entries', target_user_id, entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add manual refresh function to useJournal hook
COMMENT ON FUNCTION refresh_user_badge_progress(UUID) IS 
'Manually refreshes badge progress for a user. Call this function after adding entries if badge progress is not updating automatically.';