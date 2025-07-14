/*
  # Fix User Profile Creation Trigger

  1. Changes
    - Fix the handle_new_user function to properly create profiles for new users
    - Ensure the function handles all required fields correctly
    - Recreate the trigger to ensure it's properly attached to auth.users table
  
  2. Reason
    - The current trigger is causing database errors when saving new users
    - This is preventing user signup from working properly
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user with proper error handling
  BEGIN
    INSERT INTO public.profiles (
      user_id,
      name,
      current_streak,
      best_streak,
      journaling_goal_frequency,
      total_badges_earned,
      subscription_status,
      subscription_tier,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      0,
      0,
      3,
      0,
      'free',
      'free',
      NEW.created_at,
      NEW.created_at
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;
  
  -- Initialize badges for the new user
  BEGIN
    INSERT INTO public.user_badges (
      user_id,
      badge_id,
      progress_current,
      earned,
      progress_percentage
    )
    SELECT
      NEW.id,
      badges.id,
      0,
      false,
      0
    FROM
      public.badges;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error initializing badges for user %: %', NEW.id, SQLERRM;
      -- Don't raise exception here to allow profile creation to succeed
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates a profile and initializes badges for new users when they sign up.';