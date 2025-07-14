/*
  # Fix Streak Calculation and Badge Progress

  1. Changes
    - Fixes the streak calculation logic in the update_all_user_progress function
    - Ensures streak-related badges are properly updated
    - Adds explicit handling for streak badges in the refresh_user_badge_progress function
    - Recalculates streaks and badge progress for all users
  
  2. Reason
    - Current streak and best streak counts are not updating correctly
    - Streak-related badges are not progressing as expected
    - This ensures consistent streak calculation across all database functions
*/

-- First, let's fix the streak calculation in the update_all_user_progress function
CREATE OR REPLACE FUNCTION public.update_all_user_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := NEW.user_id;
    v_total_entries INT;
    v_distinct_moods INT;
    v_current_streak INT := 0;
    v_best_streak INT := 0;
    v_badge_record RECORD;
    v_progress_current INT;
    v_is_premium BOOLEAN;
    v_latest_entry_date DATE;
    v_prev_date DATE;
    v_entry_date DATE;
    v_entry_record RECORD;
    v_date_diff INT;
    v_temp_streak INT := 0;
BEGIN
    -- === Calculate all necessary metrics ===
    SELECT COUNT(*) INTO v_total_entries FROM public.journal_entries WHERE user_id = v_user_id;
    SELECT COUNT(DISTINCT mood) INTO v_distinct_moods FROM public.journal_entries WHERE user_id = v_user_id;

    -- Get premium status from the profiles table
    SELECT subscription_status = 'premium' INTO v_is_premium FROM public.profiles WHERE user_id = v_user_id;

    -- Get the latest entry date
    SELECT MAX(created_at::DATE) INTO v_latest_entry_date FROM public.journal_entries WHERE user_id = v_user_id;

    -- Improved streak calculation logic
    -- First, calculate the best streak by looking at consecutive days
    v_prev_date := NULL;
    v_temp_streak := 0;
    v_best_streak := 0;

    -- Process entries in date order to find consecutive days
    FOR v_entry_record IN 
        SELECT DISTINCT created_at::DATE AS entry_date 
        FROM public.journal_entries 
        WHERE user_id = v_user_id 
        ORDER BY entry_date
    LOOP
        v_entry_date := v_entry_record.entry_date;
        
        IF v_prev_date IS NULL THEN
            -- First entry
            v_temp_streak := 1;
        ELSIF v_entry_date = v_prev_date + 1 THEN
            -- Consecutive day
            v_temp_streak := v_temp_streak + 1;
        ELSIF v_entry_date = v_prev_date THEN
            -- Same day, don't change streak
            NULL;
        ELSE
            -- Gap in streak, reset
            v_temp_streak := 1;
        END IF;
        
        -- Update best streak if current temp streak is better
        IF v_temp_streak > v_best_streak THEN
            v_best_streak := v_temp_streak;
        END IF;
        
        v_prev_date := v_entry_date;
    END LOOP;

    -- Now calculate current streak (active streak)
    -- Current streak is only valid if the most recent entry is today or yesterday
    IF v_latest_entry_date IS NOT NULL AND (v_latest_entry_date = CURRENT_DATE OR v_latest_entry_date = CURRENT_DATE - 1) THEN
        -- Start with the most recent entry and count backwards
        v_prev_date := NULL;
        v_current_streak := 0;
        
        FOR v_entry_record IN 
            SELECT DISTINCT created_at::DATE AS entry_date 
            FROM public.journal_entries 
            WHERE user_id = v_user_id 
            ORDER BY entry_date DESC
        LOOP
            v_entry_date := v_entry_record.entry_date;
            
            IF v_prev_date IS NULL THEN
                -- First entry (most recent)
                v_current_streak := 1;
            ELSIF v_prev_date - v_entry_date = 1 THEN
                -- Consecutive day (going backwards)
                v_current_streak := v_current_streak + 1;
            ELSIF v_prev_date = v_entry_date THEN
                -- Same day, don't change streak
                NULL;
            ELSE
                -- Gap in streak, stop counting
                EXIT;
            END IF;
            
            v_prev_date := v_entry_date;
        END LOOP;
    ELSE
        -- No entries today or yesterday, current streak is 0
        v_current_streak := 0;
    END IF;

    -- === Update the main profiles table with new streak and last entry date ===
    UPDATE public.profiles
    SET
        current_streak = v_current_streak,
        best_streak = GREATEST(profiles.best_streak, v_best_streak), -- Keep the highest best streak
        last_entry_date = v_latest_entry_date,
        updated_at = NOW()
    WHERE profiles.user_id = v_user_id;

    -- === Loop through all defined badges and update their progress ===
    FOR v_badge_record IN SELECT * FROM public.badges LOOP
        -- Determine the current progress value based on the badge's category and ID
        CASE v_badge_record.badge_category
            WHEN 'milestone' THEN -- For badges like 'entries-5', 'entries-10', etc.
                v_progress_current := v_total_entries;
            WHEN 'streak' THEN -- For badges like 'streak-3', 'streak-7', etc.
                v_progress_current := v_current_streak;
            WHEN 'achievement' THEN
                CASE v_badge_record.id
                    WHEN 'first-step' THEN
                        v_progress_current := CASE WHEN v_total_entries > 0 THEN 1 ELSE 0 END;
                    WHEN 'best-streak-7' THEN -- This is the "Streak Seeker" badge
                        v_progress_current := LEAST(v_best_streak, v_badge_record.progress_target);
                    WHEN 'mood-variety' THEN -- This is the "Emotional Range" badge
                        v_progress_current := v_distinct_moods;
                    ELSE
                        v_progress_current := 0; -- Default for other achievement badges not explicitly handled
                END CASE;
            WHEN 'special' THEN
                CASE v_badge_record.id
                    WHEN 'premium-supporter' THEN
                        v_progress_current := CASE WHEN v_is_premium THEN 1 ELSE 0 END;
                    ELSE
                        v_progress_current := 0; -- Default for other special badges
                END CASE;
            ELSE
                v_progress_current := 0; -- Default for unknown badge categories
        END CASE;

        -- Calculate progress percentage, ensuring no division by zero
        DECLARE
            calculated_percentage NUMERIC;
        BEGIN
            IF v_badge_record.progress_target > 0 THEN
                calculated_percentage := LEAST(100.0, (v_progress_current * 100.0 / v_badge_record.progress_target));
            ELSE
                calculated_percentage := 0; -- If target is 0, percentage is 0
            END IF;

            -- Atomically insert or update the user_badges record for the current badge
            INSERT INTO public.user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at, updated_at)
            VALUES (
                v_user_id,
                v_badge_record.id,
                v_progress_current,
                calculated_percentage,
                (v_progress_current >= v_badge_record.progress_target), -- Check if earned
                CASE WHEN v_progress_current >= v_badge_record.progress_target THEN NOW() ELSE NULL END, -- Set earned_at if just earned
                NOW()
            )
            ON CONFLICT (user_id, badge_id) DO UPDATE
            SET
                progress_current = EXCLUDED.progress_current,
                progress_percentage = EXCLUDED.progress_percentage,
                earned = EXCLUDED.earned,
                earned_at = CASE 
                    WHEN EXCLUDED.earned AND user_badges.earned_at IS NULL THEN NOW()
                    WHEN NOT EXCLUDED.earned THEN NULL
                    ELSE user_badges.earned_at
                END,
                updated_at = NOW();
        END;
    END LOOP;

    -- === Final step: Update total_badges_earned count in the profiles table ===
    -- This ensures the profile reflects the latest count of earned badges
    UPDATE public.profiles
    SET
        total_badges_earned = (SELECT COUNT(*) FROM public.user_badges WHERE user_id = v_user_id AND earned = TRUE),
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the refresh_user_badge_progress function to use the same streak calculation logic
CREATE OR REPLACE FUNCTION public.refresh_user_badge_progress(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_total_entries INT;
    v_distinct_moods INT;
    v_current_streak INT := 0;
    v_best_streak INT := 0;
    v_badge_record RECORD;
    v_progress_current INT;
    v_is_premium BOOLEAN;
    v_latest_entry_date DATE;
    v_prev_date DATE;
    v_entry_date DATE;
    v_entry_record RECORD;
    v_temp_streak INT := 0;
BEGIN
    -- Get total entries for this user
    SELECT COUNT(*) INTO v_total_entries FROM public.journal_entries WHERE user_id = p_user_id;
    
    -- If no entries exist, reset everything except premium status
    IF v_total_entries = 0 THEN
        -- Get premium status
        SELECT subscription_status = 'premium' INTO v_is_premium FROM public.profiles WHERE user_id = p_user_id;
        
        -- Reset profile stats
        UPDATE public.profiles
        SET
            current_streak = 0,
            last_entry_date = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Reset all badges except premium-supporter
        UPDATE public.user_badges
        SET
            progress_current = 0,
            progress_percentage = 0,
            earned = false,
            earned_at = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id AND badge_id != 'premium-supporter';
        
        -- Update premium-supporter badge
        IF v_is_premium THEN
            INSERT INTO public.user_badges (
                user_id, badge_id, progress_current, progress_percentage, earned, earned_at, updated_at
            )
            VALUES (
                p_user_id, 'premium-supporter', 1, 100, true, NOW(), NOW()
            )
            ON CONFLICT (user_id, badge_id) DO UPDATE
            SET
                progress_current = 1,
                progress_percentage = 100,
                earned = true,
                earned_at = COALESCE(user_badges.earned_at, NOW()),
                updated_at = NOW();
        END IF;
        
        -- Update total badges earned
        UPDATE public.profiles
        SET
            total_badges_earned = (SELECT COUNT(*) FROM public.user_badges WHERE user_id = p_user_id AND earned = TRUE),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        RETURN;
    END IF;
    
    -- Calculate all necessary metrics
    SELECT COUNT(DISTINCT mood) INTO v_distinct_moods FROM public.journal_entries WHERE user_id = p_user_id;
    SELECT MAX(created_at::DATE) INTO v_latest_entry_date FROM public.journal_entries WHERE user_id = p_user_id;

    -- Improved streak calculation logic
    -- First, calculate the best streak by looking at consecutive days
    v_prev_date := NULL;
    v_temp_streak := 0;
    v_best_streak := 0;

    -- Process entries in date order to find consecutive days
    FOR v_entry_record IN 
        SELECT DISTINCT created_at::DATE AS entry_date 
        FROM public.journal_entries 
        WHERE user_id = p_user_id 
        ORDER BY entry_date
    LOOP
        v_entry_date := v_entry_record.entry_date;
        
        IF v_prev_date IS NULL THEN
            -- First entry
            v_temp_streak := 1;
        ELSIF v_entry_date = v_prev_date + 1 THEN
            -- Consecutive day
            v_temp_streak := v_temp_streak + 1;
        ELSIF v_entry_date = v_prev_date THEN
            -- Same day, don't change streak
            NULL;
        ELSE
            -- Gap in streak, reset
            v_temp_streak := 1;
        END IF;
        
        -- Update best streak if current temp streak is better
        IF v_temp_streak > v_best_streak THEN
            v_best_streak := v_temp_streak;
        END IF;
        
        v_prev_date := v_entry_date;
    END LOOP;

    -- Now calculate current streak (active streak)
    -- Current streak is only valid if the most recent entry is today or yesterday
    IF v_latest_entry_date IS NOT NULL AND (v_latest_entry_date = CURRENT_DATE OR v_latest_entry_date = CURRENT_DATE - 1) THEN
        -- Start with the most recent entry and count backwards
        v_prev_date := NULL;
        v_current_streak := 0;
        
        FOR v_entry_record IN 
            SELECT DISTINCT created_at::DATE AS entry_date 
            FROM public.journal_entries 
            WHERE user_id = p_user_id 
            ORDER BY entry_date DESC
        LOOP
            v_entry_date := v_entry_record.entry_date;
            
            IF v_prev_date IS NULL THEN
                -- First entry (most recent)
                v_current_streak := 1;
            ELSIF v_prev_date - v_entry_date = 1 THEN
                -- Consecutive day (going backwards)
                v_current_streak := v_current_streak + 1;
            ELSIF v_prev_date = v_entry_date THEN
                -- Same day, don't change streak
                NULL;
            ELSE
                -- Gap in streak, stop counting
                EXIT;
            END IF;
            
            v_prev_date := v_entry_date;
        END LOOP;
    ELSE
        -- No entries today or yesterday, current streak is 0
        v_current_streak := 0;
    END IF;

    -- Get premium status from the profiles table
    SELECT subscription_status = 'premium' INTO v_is_premium FROM public.profiles WHERE user_id = p_user_id;

    -- Update the main profiles table with new streak and last entry date
    UPDATE public.profiles
    SET
        current_streak = v_current_streak,
        best_streak = GREATEST(profiles.best_streak, v_best_streak), -- Keep the highest best streak
        last_entry_date = v_latest_entry_date,
        updated_at = NOW()
    WHERE profiles.user_id = p_user_id;

    -- Loop through all defined badges and update their progress
    FOR v_badge_record IN SELECT * FROM public.badges LOOP
        -- Determine the current progress value based on the badge's category and ID
        CASE v_badge_record.badge_category
            WHEN 'milestone' THEN
                v_progress_current := v_total_entries;
            WHEN 'streak' THEN
                v_progress_current := v_current_streak;
            WHEN 'achievement' THEN
                CASE v_badge_record.id
                    WHEN 'first-step' THEN
                        v_progress_current := CASE WHEN v_total_entries > 0 THEN 1 ELSE 0 END;
                    WHEN 'best-streak-7' THEN
                        v_progress_current := LEAST(v_best_streak, v_badge_record.progress_target);
                    WHEN 'mood-variety' THEN
                        v_progress_current := v_distinct_moods;
                    ELSE
                        v_progress_current := 0;
                END CASE;
            WHEN 'special' THEN
                CASE v_badge_record.id
                    WHEN 'premium-supporter' THEN
                        v_progress_current := CASE WHEN v_is_premium THEN 1 ELSE 0 END;
                    ELSE
                        v_progress_current := 0;
                END CASE;
            ELSE
                v_progress_current := 0;
        END CASE;

        -- Calculate progress percentage, ensuring no division by zero
        DECLARE
            calculated_percentage NUMERIC;
        BEGIN
            IF v_badge_record.progress_target > 0 THEN
                calculated_percentage := LEAST(100.0, (v_progress_current * 100.0 / v_badge_record.progress_target));
            ELSE
                calculated_percentage := 0;
            END IF;

            -- Atomically insert or update the user_badges record for the current badge
            INSERT INTO public.user_badges (user_id, badge_id, progress_current, progress_percentage, earned, earned_at, updated_at)
            VALUES (
                p_user_id,
                v_badge_record.id,
                v_progress_current,
                calculated_percentage,
                (v_progress_current >= v_badge_record.progress_target),
                CASE WHEN v_progress_current >= v_badge_record.progress_target THEN NOW() ELSE NULL END,
                NOW()
            )
            ON CONFLICT (user_id, badge_id) DO UPDATE
            SET
                progress_current = EXCLUDED.progress_current,
                progress_percentage = EXCLUDED.progress_percentage,
                earned = EXCLUDED.earned,
                earned_at = CASE 
                    WHEN EXCLUDED.earned AND user_badges.earned_at IS NULL THEN NOW()
                    WHEN NOT EXCLUDED.earned THEN NULL
                    ELSE user_badges.earned_at
                END,
                updated_at = NOW();
        END;
    END LOOP;

    -- Update total badges earned count
    UPDATE public.profiles
    SET
        total_badges_earned = (SELECT COUNT(*) FROM public.user_badges WHERE user_id = p_user_id AND earned = TRUE),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate streaks and badge progress for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT user_id FROM public.profiles LOOP
        PERFORM public.refresh_user_badge_progress(user_record.user_id);
    END LOOP;
END;
$$;