/*
  # Fix Duplicate Badges

  1. Changes
    - Removes problematic badges that cause errors
    - Fixes duplicate "First Step" badges by consolidating them
    - Ensures all badge references are consistent
    - Cleans up any duplicate user_badge entries
  
  2. Reason
    - Duplicate badges were causing UI issues and confusion
    - Some badges had inconsistent categorization
    - This ensures a clean badge system with no duplicates
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
  duplicate_record RECORD;
BEGIN
  -- Check if we have multiple badges with the name 'First Steps' or 'First Step'
  SELECT COUNT(*) INTO duplicate_count
  FROM public.badges
  WHERE badge_name IN ('First Steps', 'First Step');
  
  RAISE NOTICE 'Found % badges with name First Step(s)', duplicate_count;
  
  -- If we have more than one, keep only the canonical one
  IF duplicate_count > 1 THEN
    -- Process each duplicate individually to avoid constraint violations
    FOR duplicate_record IN
      SELECT id
      FROM public.badges
      WHERE badge_name IN ('First Steps', 'First Step')
      AND id != canonical_id
    LOOP
      RAISE NOTICE 'Processing duplicate badge ID: %', duplicate_record.id;
      
      -- Delete any user_badges entries for this duplicate that would conflict
      -- with existing entries for the canonical badge
      DELETE FROM public.user_badges
      WHERE badge_id = duplicate_record.id
      AND user_id IN (
        SELECT user_id 
        FROM public.user_badges 
        WHERE badge_id = canonical_id
      );
      
      -- Update remaining user_badges to point to the canonical badge
      UPDATE public.user_badges
      SET badge_id = canonical_id
      WHERE badge_id = duplicate_record.id;
      
      -- Delete the duplicate badge
      DELETE FROM public.badges
      WHERE id = duplicate_record.id;
    END LOOP;
    
    RAISE NOTICE 'Removed duplicate First Step badges';
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
END $$;

-- Check for and remove any 'first_entry' badge if it exists (another potential duplicate)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.badges WHERE id = 'first_entry') THEN
    -- Delete any user_badges entries for this duplicate that would conflict
    -- with existing entries for the canonical badge
    DELETE FROM public.user_badges
    WHERE badge_id = 'first_entry'
    AND user_id IN (
      SELECT user_id 
      FROM public.user_badges 
      WHERE badge_id = 'first-step'
    );
    
    -- Update remaining user_badges to point to the canonical badge
    UPDATE public.user_badges
    SET badge_id = 'first-step'
    WHERE badge_id = 'first_entry';
    
    -- Delete the duplicate badge
    DELETE FROM public.badges
    WHERE id = 'first_entry';
    
    RAISE NOTICE 'Removed first_entry badge and updated references to first-step';
  END IF;
END $$;

-- Fix any other potential badge duplicates by name
DO $$
DECLARE
  badge_name_record RECORD;
  canonical_record RECORD;
  duplicate_record RECORD;
BEGIN
  -- Find badge names that have multiple entries
  FOR badge_name_record IN
    SELECT badge_name, COUNT(*) as count
    FROM public.badges
    GROUP BY badge_name
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Found % duplicate badges with name: %', 
      badge_name_record.count, badge_name_record.badge_name;
    
    -- Get the first badge as the canonical one
    SELECT * INTO canonical_record
    FROM public.badges
    WHERE badge_name = badge_name_record.badge_name
    ORDER BY created_at
    LIMIT 1;
    
    -- Process each duplicate
    FOR duplicate_record IN
      SELECT id
      FROM public.badges
      WHERE badge_name = badge_name_record.badge_name
      AND id != canonical_record.id
    LOOP
      RAISE NOTICE 'Processing duplicate badge ID: % (keeping %)', 
        duplicate_record.id, canonical_record.id;
      
      -- Delete any user_badges entries for this duplicate that would conflict
      DELETE FROM public.user_badges
      WHERE badge_id = duplicate_record.id
      AND user_id IN (
        SELECT user_id 
        FROM public.user_badges 
        WHERE badge_id = canonical_record.id
      );
      
      -- Update remaining user_badges to point to the canonical badge
      UPDATE public.user_badges
      SET badge_id = canonical_record.id
      WHERE badge_id = duplicate_record.id;
      
      -- Delete the duplicate badge
      DELETE FROM public.badges
      WHERE id = duplicate_record.id;
    END LOOP;
  END LOOP;
END $$;

-- Remove duplicate user_badges entries (fixing the MIN function error)
DO $$
DECLARE
  duplicate_record RECORD;
  keep_id UUID;
BEGIN
  -- Find duplicate user_badge entries
  FOR duplicate_record IN
    SELECT user_id, badge_id, COUNT(*) as count
    FROM public.user_badges
    GROUP BY user_id, badge_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Found % duplicate user_badges for user % and badge %',
      duplicate_record.count, duplicate_record.user_id, duplicate_record.badge_id;
    
    -- Get the ID to keep (first one by ID order)
    SELECT id INTO keep_id
    FROM public.user_badges
    WHERE user_id = duplicate_record.user_id
    AND badge_id = duplicate_record.badge_id
    ORDER BY id
    LIMIT 1;
    
    -- Delete all duplicates except the one to keep
    DELETE FROM public.user_badges
    WHERE user_id = duplicate_record.user_id
    AND badge_id = duplicate_record.badge_id
    AND id != keep_id;
    
    RAISE NOTICE 'Kept user_badge with ID % and deleted duplicates', keep_id;
  END LOOP;
END $$;

-- Update total badges earned count for all users
UPDATE public.profiles
SET total_badges_earned = (
  SELECT COUNT(*)
  FROM public.user_badges
  WHERE user_id = profiles.user_id AND earned = true
);