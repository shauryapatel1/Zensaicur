/*
  # Fix user_badges RLS policy for database functions

  1. Problem
    - Current RLS policies on user_badges table are too restrictive
    - Database triggers/functions cannot insert/update badge records
    - This causes journal entry creation to fail

  2. Solution
    - Update INSERT policy to allow database functions to create badge records
    - Update UPDATE policy to allow database functions to update badge progress
    - Maintain security by still restricting user access to their own badges

  3. Changes
    - Drop existing restrictive policies
    - Create new policies that allow both user access and database function access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;

-- Create new INSERT policy that allows both users and database functions
CREATE POLICY "Users and functions can insert badges"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is inserting their own badge
    auth.uid() = user_id 
    OR 
    -- Allow if called from a database function/trigger (no auth context)
    auth.uid() IS NULL
  );

-- Create new SELECT policy (unchanged from before)
CREATE POLICY "Users can view their own badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new UPDATE policy that allows both users and database functions
CREATE POLICY "Users and functions can update badges"
  ON user_badges
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is updating their own badge
    auth.uid() = user_id 
    OR 
    -- Allow if called from a database function/trigger (no auth context)
    auth.uid() IS NULL
  )
  WITH CHECK (
    -- Ensure the user_id doesn't change and still belongs to the user
    auth.uid() = user_id 
    OR 
    -- Allow if called from a database function/trigger (no auth context)
    auth.uid() IS NULL
  );

-- Create DELETE policy for completeness
CREATE POLICY "Users can delete their own badges"
  ON user_badges
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);