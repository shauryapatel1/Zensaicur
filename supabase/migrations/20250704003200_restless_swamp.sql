/*
  # Fix Streak Calculation Trigger

  1. Changes
    - Modifies the on_journal_entry_insert trigger to execute the update_streak_on_new_entry function
    - This ensures that streaks are properly calculated when a new journal entry is added
  
  2. Reason
    - Currently the trigger is using a placeholder function (trigger_recalculate_streaks)
    - The actual streak calculation logic is in update_streak_on_new_entry but not being called
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_journal_entry_insert ON journal_entries;

-- Recreate the trigger with the correct function
CREATE TRIGGER on_journal_entry_insert
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_new_entry();