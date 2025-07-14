/*
  # Remove Problematic Badges

  1. Changes
    - Removes the 'emotional-range' and 'streak-seeker' badges from the database
    - Deletes associated user_badge entries for these badges
  
  2. Reason
    - These badges are causing foreign key constraint errors
    - The badges are not properly integrated with the badge tracking system
*/

-- Delete user badge entries first to avoid foreign key constraint errors
DELETE FROM public.user_badges WHERE badge_id = 'emotional-range';
DELETE FROM public.user_badges WHERE badge_id = 'streak-seeker';

-- Delete the badges from the badges table
DELETE FROM public.badges WHERE id = 'emotional-range';
DELETE FROM public.badges WHERE id = 'streak-seeker';

-- Update the total badges earned count for all users
UPDATE public.profiles
SET total_badges_earned = (
  SELECT COUNT(*)
  FROM public.user_badges
  WHERE user_id = profiles.user_id AND earned = true
);

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Removed problematic badges: emotional-range and streak-seeker';
END $$;