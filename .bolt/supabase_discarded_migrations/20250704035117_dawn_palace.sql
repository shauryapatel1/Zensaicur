-- This migration provides the definitive fix for all badge calculations
-- by using a comprehensive function that updates the EXISTING table schema.

-- Step 1: Clean up all previous, related objects to avoid conflicts and redundant execution.

-- Drop existing triggers that handle badge and streak updates on journal_entries insert
DROP TRIGGER IF EXISTS on_journal_entry_badge_update ON public.journal_entries;
DROP TRIGGER IF EXISTS on_journal_entry_insert ON public.journal_entries;

-- Drop the functions previously associated with these triggers
DROP FUNCTION IF EXISTS public.update_badges_on_journal_entry();
DROP FUNCTION IF EXISTS public.update_streak_on_new_entry();

-- Drop the old update_all_user_progress function if it exists from previous attempts
DROP FUNCTION IF EXISTS public.update_all_user_progress();


-- Step 2: Create the new, all-in-one comprehensive badge and profile update function.
CREATE OR REPLACE FUNCTION public.update_all_user_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := NEW.user_id;
    v_total_entries INT;
    v_distinct_moods INT;
    v_calculated_current_streak INT;
    v_calculated_best_streak INT;
    v_badge_record RECORD;
    v_progress_current INT;
    v_is_premium BOOLEAN;
BEGIN
    -- === Calculate all necessary metrics ===
    SELECT COUNT(*) INTO v_total_entries FROM public.journal_entries WHERE user_id = v_user_id;
    SELECT COUNT(DISTINCT mood) INTO v_distinct_moods FROM public.journal_entries WHERE user_id = v_user_id;

    -- Robust streak calculation
    -- This CTE calculates both current and best streak based on journal entries
    WITH user_entry_dates AS (
        SELECT DISTINCT created_at::DATE AS entry_date FROM public.journal_entries WHERE user_id = v_user_id
    ), date_groups AS (
        SELECT entry_date, (entry_date - (ROW_NUMBER() OVER (ORDER BY entry_date DESC))::int) AS streak_group FROM user_entry_dates
    ), streaks AS (
        SELECT COUNT(*) AS streak_length, MAX(entry_date) AS last_day FROM date_groups GROUP BY streak_group
    )
    SELECT
        -- Current streak: check if the last day of any streak group is today or yesterday
        COALESCE((SELECT streak_length FROM streaks WHERE last_day = CURRENT_DATE OR last_day = CURRENT_DATE - INTERVAL '1 day' ORDER BY last_day DESC LIMIT 1), 0),
        -- Best streak: the maximum streak length found
        COALESCE(MAX(streak_length), 0)
    INTO v_calculated_current_streak, v_calculated_best_streak
    FROM streaks;

    -- Get premium status from the profiles table
    SELECT subscription_status = 'premium' INTO v_is_premium FROM public.profiles WHERE user_id = v_user_id;

    -- === Update the main profiles table with new streak and last entry date ===
    UPDATE public.profiles
    SET
        current_streak = v_calculated_current_streak,
        best_streak = GREATEST(profiles.best_streak, v_calculated_best_streak), -- Keep the highest best streak
        last_entry_date = NEW.created_at::DATE, -- Ensure it's a DATE type
        updated_at = NOW()
    WHERE profiles.user_id = v_user_id;

    -- === Loop through all defined badges and update their progress ===
    FOR v_badge_record IN SELECT * FROM public.badges LOOP
        -- Determine the current progress value based on the badge's category and ID
        CASE v_badge_record.badge_category -- Corrected from 'category' to 'badge_category'
            WHEN 'milestone' THEN -- For badges like 'entries-5', 'entries-10', etc.
                v_progress_current := v_total_entries;
            WHEN 'streak' THEN -- For badges like 'streak-3', 'streak-7', etc.
                v_progress_current := v_calculated_current_streak;
            WHEN 'achievement' THEN
                CASE v_badge_record.id
                    WHEN 'first-step' THEN
                        v_progress_current := CASE WHEN v_total_entries > 0 THEN 1 ELSE 0 END;
                    WHEN 'best-streak-7' THEN -- This is the "Streak Seeker" badge
                        v_progress_current := LEAST(v_calculated_best_streak, v_badge_record.progress_target);
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
                earned_at = COALESCE(user_badges.earned_at, EXCLUDED.earned_at), -- Keep existing earned_at if already earned
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


-- Step 3: Recreate the main trigger that connects the new comprehensive function to journal entry inserts.
-- This replaces the previous separate triggers for streak and badge updates.
CREATE TRIGGER on_journal_entry_insert
AFTER INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_all_user_progress();

-- Step 4: Create a function to handle badge updates when subscription status changes
CREATE OR REPLACE FUNCTION update_badges_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := NEW.user_id;
    v_is_premium BOOLEAN;
BEGIN
    -- Check if subscription status changed
    IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
        -- Determine if user is now premium
        v_is_premium := (NEW.subscription_status = 'premium');
        
        -- Update the premium-supporter badge
        INSERT INTO public.user_badges (
            user_id, 
            badge_id, 
            progress_current, 
            progress_percentage,
            earned, 
            earned_at,
            updated_at
        )
        VALUES (
            v_user_id, 
            'premium-supporter', 
            CASE WHEN v_is_premium THEN 1 ELSE 0 END,
            CASE WHEN v_is_premium THEN 100 ELSE 0 END,
            v_is_premium,
            CASE WHEN v_is_premium THEN NOW() ELSE NULL END,
            NOW()
        )
        ON CONFLICT (user_id, badge_id) DO UPDATE
        SET
            progress_current = CASE WHEN v_is_premium THEN 1 ELSE 0 END,
            progress_percentage = CASE WHEN v_is_premium THEN 100 ELSE 0 END,
            earned = v_is_premium,
            earned_at = CASE 
                WHEN v_is_premium AND user_badges.earned_at IS NULL THEN NOW() 
                WHEN NOT v_is_premium THEN NULL
                ELSE user_badges.earned_at 
            END,
            updated_at = NOW();
            
        -- Update total badges earned count
        UPDATE public.profiles
        SET
            total_badges_earned = (SELECT COUNT(*) FROM public.user_badges WHERE user_id = v_user_id AND earned = TRUE),
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a trigger for subscription status changes
DROP TRIGGER IF EXISTS on_profile_subscription_update ON public.profiles;
CREATE TRIGGER on_profile_subscription_update
AFTER UPDATE OF subscription_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_badges_on_subscription_change();

-- Step 6: Create a function to handle journal entry deletion
CREATE OR REPLACE FUNCTION handle_journal_entry_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- After deleting a journal entry, recalculate all badge progress
    PERFORM public.update_all_user_progress() FROM public.journal_entries WHERE user_id = OLD.user_id LIMIT 1;
    
    -- If no entries remain, reset streak and update badges accordingly
    IF NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE user_id = OLD.user_id) THEN
        UPDATE public.profiles
        SET
            current_streak = 0,
            last_entry_date = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        
        -- Reset progress for all badges except premium-supporter
        UPDATE public.user_badges
        SET
            progress_current = 0,
            progress_percentage = 0,
            earned = false,
            earned_at = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.user_id AND badge_id != 'premium-supporter';
        
        -- Update total badges earned count
        UPDATE public.profiles
        SET
            total_badges_earned = (SELECT COUNT(*) FROM public.user_badges WHERE user_id = OLD.user_id AND earned = TRUE),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a trigger for journal entry deletion
DROP TRIGGER IF EXISTS on_journal_entry_delete ON public.journal_entries;
CREATE TRIGGER on_journal_entry_delete
AFTER DELETE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION handle_journal_entry_delete();

-- Step 8: Create a function to manually refresh badge progress
CREATE OR REPLACE FUNCTION public.refresh_user_badge_progress(p_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Simulate a journal entry insert to trigger the badge update function
    -- This is a clean way to reuse the same logic for manual refreshes
    IF EXISTS (SELECT 1 FROM public.journal_entries WHERE user_id = p_user_id LIMIT 1) THEN
        PERFORM public.update_all_user_progress() FROM public.journal_entries WHERE user_id = p_user_id LIMIT 1;
    ELSE
        -- If no entries exist, manually update the profile and badges
        UPDATE public.profiles
        SET
            current_streak = 0,
            last_entry_date = NULL,
            total_badges_earned = (
                SELECT COUNT(*) FROM public.user_badges 
                WHERE user_id = p_user_id AND earned = TRUE
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Reset progress for all badges except premium-supporter
        UPDATE public.user_badges
        SET
            progress_current = 0,
            progress_percentage = 0,
            earned = false,
            earned_at = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id AND badge_id != 'premium-supporter';
        
        -- Check if user is premium and update premium-supporter badge
        DECLARE
            v_is_premium BOOLEAN;
        BEGIN
            SELECT subscription_status = 'premium' INTO v_is_premium 
            FROM public.profiles WHERE user_id = p_user_id;
            
            INSERT INTO public.user_badges (
                user_id, 
                badge_id, 
                progress_current, 
                progress_percentage,
                earned, 
                earned_at,
                updated_at
            )
            VALUES (
                p_user_id, 
                'premium-supporter', 
                CASE WHEN v_is_premium THEN 1 ELSE 0 END,
                CASE WHEN v_is_premium THEN 100 ELSE 0 END,
                v_is_premium,
                CASE WHEN v_is_premium THEN NOW() ELSE NULL END,
                NOW()
            )
            ON CONFLICT (user_id, badge_id) DO UPDATE
            SET
                progress_current = CASE WHEN v_is_premium THEN 1 ELSE 0 END,
                progress_percentage = CASE WHEN v_is_premium THEN 100 ELSE 0 END,
                earned = v_is_premium,
                earned_at = CASE 
                    WHEN v_is_premium AND user_badges.earned_at IS NULL THEN NOW() 
                    WHEN NOT v_is_premium THEN NULL
                    ELSE user_badges.earned_at 
                END,
                updated_at = NOW();
        END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_user_badge_progress(uuid) TO authenticated;

-- Step 9: Ensure the mood-variety badge exists
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES (
  'mood-variety',
  'Emotional Range',
  'Use all 5 different mood options in your entries',
  '🎭',
  'achievement',
  'rare',
  5
)
ON CONFLICT (id) DO UPDATE SET
  badge_name = 'Emotional Range',
  badge_description = 'Use all 5 different mood options in your entries',
  badge_icon = '🎭',
  badge_category = 'achievement',
  badge_rarity = 'rare',
  progress_target = 5;

-- Step 10: Ensure the best-streak-7 badge exists
INSERT INTO badges (id, badge_name, badge_description, badge_icon, badge_category, badge_rarity, progress_target)
VALUES (
  'best-streak-7',
  'Streak Seeker',
  'Achieve a 7-day streak at any point',
  '🎯',
  'achievement',
  'rare',
  7
)
ON CONFLICT (id) DO UPDATE SET
  badge_name = 'Streak Seeker',
  badge_description = 'Achieve a 7-day streak at any point',
  badge_icon = '🎯',
  badge_category = 'achievement',
  badge_rarity = 'rare',
  progress_target = 7;

-- Step 11: Refresh badge progress for all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT user_id FROM public.profiles LOOP
        PERFORM public.refresh_user_badge_progress(user_record.user_id);
    END LOOP;
END;
$$;