/*
  # Fix Duplicate Badges

  1. Changes
    - Remove any duplicate 'First Step' badges
    - Ensure the canonical 'first-step' badge has the correct category
    - Remove problematic badges 'emotional-range' and 'streak-seeker'
    - Update user_badges table to reflect these changes
  
  2. Reason
    - Users are seeing duplicate badges in the UI
    - Some badges are incorrectly categorized
    - The 'emotional-range' and 'streak-seeker' badges are causing issues
*/

-- First, delete user badge entries for problematic badges to avoid foreign key constraint errors
DELETE FROM public.user_badges WHERE badge_id IN ('emotional-range', 'streak-seeker');

-- Delete the problematic badges from the badges table
DELETE FROM public.badges WHERE id IN ('emotional-range', 'streak-seeker');

-- Find and fix duplicate First Step badges
DO $$
DECLARE
  canonical_id TEXT := 'first-step';
  duplicate_count INTEGER;
  duplicate_ids TEXT[];
BEGIN
  -- Check if we have multiple badges with the name 'First Steps' or 'First Step'
  SELECT COUNT(*) INTO duplicate_count
  FROM public.badges
  WHERE badge_name IN ('First Steps', 'First Step');
  
  RAISE NOTICE 'Found % badges with name First Step(s)', duplicate_count;
  
  -- If we have more than one, keep only the canonical one
  IF duplicate_count > 1 THEN
    -- Get IDs of all duplicates except the canonical one
    SELECT ARRAY_AGG(id) INTO duplicate_ids
    FROM public.badges
    WHERE badge_name IN ('First Steps', 'First Step')
    AND id != canonical_id;
    
    RAISE NOTICE 'Duplicate badge IDs to remove: %', duplicate_ids;
    
    -- Update user_badges to point to the canonical badge
    UPDATE public.user_badges
    SET badge_id = canonical_id
    WHERE badge_id = ANY(duplicate_ids);
    
    -- Delete the duplicate badges
    DELETE FROM public.badges
    WHERE id = ANY(duplicate_ids);
    
    RAISE NOTICE 'Removed % duplicate First Step badges', array_length(duplicate_ids, 1);
  END IF;
  
  -- Ensure the canonical badge has the correct properties
  UPDATE public.badges
  SET 
    badge_name = 'First Step',
    badge_description = 'Complete your very first journal entry',
    badge_icon = '🌱',
    badge_category = 'milestone',
    badge_rarity = 'common',
    progress_target = 1
  WHERE id = canonical_id;
  
  RAISE NOTICE 'Updated properties of canonical First Step badge';
  
  -- Remove any duplicate user_badges entries for the same user and badge
  WITH duplicates AS (
    SELECT user_id, badge_id, MIN(id) as keep_id
    FROM public.user_badges
    GROUP BY user_id, badge_id
    HAVING COUNT(*) > 1
  )
  DELETE FROM public.user_badges ub
  USING duplicates d
  WHERE ub.user_id = d.user_id 
    AND ub.badge_id = d.badge_id
    AND ub.id != d.keep_id;
  
  -- Update total badges earned count for all users
  UPDATE public.profiles
  SET total_badges_earned = (
    SELECT COUNT(*)
    FROM public.user_badges
    WHERE user_id = profiles.user_id AND earned = true
  );
END $$;