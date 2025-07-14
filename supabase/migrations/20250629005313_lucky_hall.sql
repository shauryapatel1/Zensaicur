/*
  # Fix ambiguous column reference for best_streak

  1. Database Functions
    - Update `update_profile_on_journal_entry()` function to properly qualify column references
    - Update `update_badges_on_journal_entry()` function to properly qualify column references
    - Ensure all column references are explicitly qualified with table names

  2. Changes
    - Replace ambiguous `best_streak` references with `profiles.best_streak`
    - Replace ambiguous `current_streak` references with `profiles.current_streak`
    - Replace other potentially ambiguous column references with proper table qualifications
*/

-- Drop and recreate the update_profile_on_journal_entry function with proper column qualifications
CREATE OR REPLACE FUNCTION update_profile_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  days_since_last_entry INTEGER;
  new_streak INTEGER;
BEGIN
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
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
  
  -- Update the profile with new streak information
  UPDATE profiles 
  SET 
    current_streak = new_streak,
    best_streak = GREATEST(COALESCE(profiles.best_streak, 0), new_streak),
    last_entry_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the update_badges_on_journal_entry function with proper column qualifications
CREATE OR REPLACE FUNCTION update_badges_on_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  entry_count INTEGER;
  streak_count INTEGER;
BEGIN
  -- Get the user's current profile data
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE user_id = NEW.user_id;
  
  -- Get total entry count for this user
  SELECT COUNT(*) INTO entry_count
  FROM journal_entries
  WHERE user_id = NEW.user_id;
  
  -- Get current streak
  streak_count := COALESCE(user_profile.current_streak, 0);
  
  -- Check and update badges based on entry count
  FOR badge_record IN 
    SELECT b.id, b.progress_target, ub.progress_current, ub.earned
    FROM badges b
    LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = NEW.user_id
    WHERE b.badge_category IN ('entries', 'streak')
  LOOP
    -- Initialize user badge if it doesn't exist
    IF badge_record.progress_current IS NULL THEN
      INSERT INTO user_badges (user_id, badge_id, progress_current, earned)
      VALUES (NEW.user_id, badge_record.id, 0, false)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Refresh the record
      SELECT ub.progress_current, ub.earned INTO badge_record.progress_current, badge_record.earned
      FROM user_badges ub
      WHERE ub.user_id = NEW.user_id AND ub.badge_id = badge_record.id;
    END IF;
    
    -- Update progress based on badge category
    IF badge_record.earned = false THEN
      -- Determine progress based on badge type
      DECLARE
        current_progress INTEGER;
        badge_category TEXT;
      BEGIN
        SELECT b.badge_category INTO badge_category
        FROM badges b
        WHERE b.id = badge_record.id;
        
        IF badge_category = 'entries' THEN
          current_progress := entry_count;
        ELSIF badge_category = 'streak' THEN
          current_progress := streak_count;
        ELSE
          current_progress := badge_record.progress_current;
        END IF;
        
        -- Update the user badge
        UPDATE user_badges
        SET 
          progress_current = current_progress,
          earned = (current_progress >= badge_record.progress_target),
          earned_at = CASE 
            WHEN current_progress >= badge_record.progress_target AND earned = false 
            THEN NOW() 
            ELSE earned_at 
          END,
          updated_at = NOW()
        WHERE user_id = NEW.user_id AND badge_id = badge_record.id;
      END;
    END IF;
  END LOOP;
  
  -- Update total badges earned count in profile
  UPDATE profiles
  SET 
    total_badges_earned = (
      SELECT COUNT(*)
      FROM user_badges
      WHERE user_id = NEW.user_id AND earned = true
    ),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the handle_new_user function also has proper qualifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, name, current_streak, best_streak, total_badges_earned)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    0,
    0,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;