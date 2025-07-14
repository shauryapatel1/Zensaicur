/*
  # Add INSERT policy for user_badges table

  1. Security
    - Add policy to allow authenticated users to insert their own badge records
    - This enables the badge system to work when journal entries are created
    - Ensures users can only insert badges for themselves

  2. Changes
    - Creates INSERT policy on user_badges table
    - Policy checks that auth.uid() matches the user_id being inserted
*/

CREATE POLICY "Users can insert their own badges"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);