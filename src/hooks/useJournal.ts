import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase'; 
import { withRetry } from '../utils/networkUtils';
import * as Sentry from '@sentry/react';
import { useAuth } from '../contexts/AuthContext';
import { useJournalEntries } from './useJournalEntries';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * Interface for journal entry data
 * @interface JournalEntry
 */
interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  mood: string;
  photo_url: string | null;
  photo_filename: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for user profile data
 * @interface Profile
 */
interface Profile {
  user_id: string;
  name: string;
  current_streak: number;
  best_streak: number;
  last_entry_date: string | null;
  journaling_goal_frequency: number;
  total_badges_earned: number;
  subscription_status: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for badge data
 * @interface Badge
 */
interface Badge {
  id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_category: string;
  badge_rarity: string;
  earned: boolean;
  earned_at: string | null;
  progress_current: number;
  progress_target: number;
  progress_percentage: number;
}

/**
 * Custom hook for managing journal-related functionality
 * 
 * @returns {Object} Journal methods and state
 * 
 * @example
 * const { 
 *   entries, 
 *   profile, 
 *   badges, 
 *   addEntry, 
 *   updateJournalingGoal 
 * } = useJournal();
 */
export function useJournal() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium, isTrialActive, isLoadingProfile: premiumProfileLoading } = usePremium();
  const { 
    entries, 
    isLoading: entriesLoading, 
    error: entriesError,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry
  } = useJournalEntries();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  /**
   * Combined loading state from entries and profile
   */
  const isLoading = entriesLoading || isLoadingProfile || premiumProfileLoading;
  
  /**
   * Combined error state from entries and profile
   */
  const error = entriesError || profileError;

  /**
   * Load user profile and entries when authentication state changes
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
      loadUserBadges();
    } else {
      setProfile(null);
      setBadges([]);
    }
  }, [isAuthenticated, user, isPremium, isTrialActive]);

  /**
   * Load user profile data from Supabase
   */
  const loadUserData = useCallback(async () => {
    if (!user) return;

    // Check if Supabase is connected
    if (!supabase) {
      console.warn('Supabase not connected. Please connect to Supabase first.');
      setIsLoadingProfile(false);
      return;
    }

    // Add user context to Sentry
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name
    });
    
    console.log('loadUserData: Fetching profile...');
    try {
      setIsLoadingProfile(true);
      setProfileError(null);

      // Check if Supabase client is properly configured
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Load profile with retry logic
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found - this might be a new user
          throw new Error('Profile not found. Please try refreshing the page.');
        }
        throw profileError;
      }

      setProfile(profileData);
      console.log('loadUserData: Fetched profile:', profileData);

      // Load entries
      await loadEntries(isTrialActive);

    } catch (err) {
      // Capture the error with additional context
      Sentry.captureException(err, {
        tags: {
          section: 'journal',
          operation: 'loadUserData'
        }
      });
      
      console.error('Error loading user data:', err);
      
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setProfileError('Unable to connect to Supabase. Please check your internet connection and ensure your Supabase project is active.');
      } else if (err instanceof Error && err.name === 'AbortError') {
        setProfileError('Connection timed out. Please check your internet connection and try again.');
      } else if (err instanceof Error) {
        setProfileError(err.message);
      } else {
        setProfileError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user, loadEntries, isPremium, isTrialActive]);

  /**
   * Load user badges from Supabase - FIXED: Removed faulty AbortController logic
   */
  const loadUserBadges = useCallback(async () => {
    if (!user) return;

    // Check if Supabase is connected
    if (!supabase) {
      console.warn('Supabase not connected. Please connect to Supabase first.');
      setBadges([]);
      return;
    }

    console.log('loadUserBadges: Fetching badges for user:', user.id);
    try {
      // Direct call to Supabase RPC without AbortController to prevent premature cancellation
      const { data: badgeData, error: badgeError } = await supabase
        .rpc('get_user_badge_progress', {
          target_user_id: user.id
        });

      if (badgeError) {
        console.warn('Error loading badges:', badgeError.message || badgeError);
        return;
      }

      setBadges(badgeData || []);
      console.log('loadUserBadges: Fetched badges:', badgeData);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to Supabase. Please check your internet connection and ensure your Supabase project is active.');
      } else {
        console.warn('Error loading badges:', err);
      }
      // Set empty badges array to prevent loading state from hanging
      setBadges([]);
    }
  }, [user]);

  /**
   * Update the user's weekly journaling goal
   * 
   * @param {number} frequency - Number of days per week (1-7)
   * @returns {Promise<{success: boolean, error?: string}>} Result object
   */
  const updateJournalingGoal = async (frequency: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isAuthenticated) {
      return { success: false, error: 'You must be logged in to update your goal' };
    }

    // Check if Supabase is connected
    if (!supabase) {
      return { success: false, error: 'Database not connected. Please connect to Supabase first.' };
    }

    if (frequency < 1 || frequency > 7) {
      return { success: false, error: 'Goal frequency must be between 1 and 7 days per week' };
    }

    try {
      setProfileError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          journaling_goal_frequency: frequency,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating goal:', updateError);
        return { success: false, error: 'Failed to update your journaling goal. Please try again.' };
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, journaling_goal_frequency: frequency } : null);
      
      // Reload badges as goal change might unlock new badges
      await loadUserBadges();

      return { success: true };
    } catch (err) {
      console.error('Error updating goal:', err);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  /**
   * Get the total number of journal entries
   * 
   * @returns {number} Total entries count
   */
  const getTotalEntries = (): number => {
    return entries.length;
  };

  /**
   * Get the date of the last journal entry
   * 
   * @returns {Date|null} Date object or null if no entries
   */
  const getLastEntryDate = (): Date | null => {
    if (!profile?.last_entry_date) return null;
    return new Date(profile.last_entry_date);
  };

  /**
   * Check if the user has already journaled today
   * 
   * @returns {boolean} True if an entry exists for today
   */
  const hasEntryToday = (): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return profile?.last_entry_date === today;
  };

  /**
   * Add a new journal entry with premium checks and profile updates
   * 
   * @param {string} content - Journal entry content
   * @param {string|null} title - Optional entry title
   * @param {MoodLevel} mood - Selected mood level
   * @param {File} [photoFile] - Optional photo attachment
   * @returns {Promise<{success: boolean, error?: string}>} Result object
   */
  const handleAddEntry = useCallback(async (
    content: string,
    title: string | null,
    mood: MoodLevel, 
    photoFile?: File | null,
    affirmationText?: string | null, 
    affirmationAudioUrl?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if Supabase is connected
    if (!supabase) {
      return { success: false, error: 'Database not connected. Please connect to Supabase first.' };
    }
    
    // Call the addEntry function from useJournalEntries
    const result = await addEntry(content, title, mood, photoFile, affirmationText, affirmationAudioUrl);
    
    try {
      console.log('Entry saved successfully, refreshing data');
      
      // Manually refresh badge progress if triggers aren't working properly
      try {
        if (user) {
          console.log('Manually refreshing badge progress via RPC');
          await supabase.rpc('refresh_user_badge_progress', {
            p_user_id: user.id
          });
        }
      } catch (rpcError) {
        console.error('Error refreshing badge progress:', rpcError);
        // Continue with normal refresh even if RPC fails
      }
      
      if (result.success) {
        console.log('Entry saved successfully, triggering badge progress update');
        
        // Explicitly call the database function to refresh badge progress
        try {
          if (user) {
            console.log('Calling refresh_user_badge_progress for user:', user.id);
            await supabase.rpc('refresh_user_badge_progress', {
              p_user_id: user.id
            });
            console.log('Successfully called refresh_user_badge_progress');
          }
        } catch (rpcError) {
          console.error('Error calling refresh_user_badge_progress:', rpcError);
          // Continue with normal refresh even if RPC fails
        }
      } else {
        console.error('Entry save failed, not updating badge progress');
      }
      
      // Refresh data from server after a short delay to allow database triggers to complete
      setTimeout(() => {
        console.log('Refreshing badges and profile data after entry save');
        loadUserBadges()
          .then(() => console.log('Badges refreshed successfully'))
          .catch(err => console.warn('Background badge refresh failed:', err));
        
        loadUserData()
          .then(() => console.log('Profile data refreshed successfully'))
          .catch(err => console.warn('Background profile refresh failed:', err));
      }, 500); // Reduced delay to 500ms for faster UI updates
    } catch (err) {
      console.error('Error updating profile after entry:', err);
    }
    
    return result;
  }, [addEntry, loadUserData, loadUserBadges, user]);
  
  /**
   * Delete a journal entry and update profile data
   * 
   * @param {string} entryId - ID of the entry to delete
   * @returns {Promise<{success: boolean, error?: string}>} Result object
   */
  const handleDeleteEntry = useCallback(async (entryId: string): Promise<{ success: boolean; error?: string }> => {
    // Check if Supabase is connected
    if (!supabase) {
      return { success: false, error: 'Database not connected. Please connect to Supabase first.' };
    }
    
    const result = await deleteEntry(entryId);
    
    try {
      // Manually refresh badge progress if triggers aren't working properly
      try {
        if (user) {
          console.log('Manually refreshing badge progress after deletion via RPC');
          await supabase.rpc('refresh_user_badge_progress', {
            p_user_id: user.id
          });
        }
      } catch (rpcError) {
        console.error('Error refreshing badge progress after deletion:', rpcError);
        // Continue with normal refresh even if RPC fails
      }
      
      if (result.success) {
        console.log('Entry deleted successfully, triggering badge progress update');
        
        // Explicitly call the database function to refresh badge progress
        try {
          if (user) {
            console.log('Calling refresh_user_badge_progress for user:', user.id);
            await supabase.rpc('refresh_user_badge_progress', {
              p_user_id: user.id
            });
            console.log('Successfully called refresh_user_badge_progress after deletion');
          }
        } catch (rpcError) {
          console.error('Error calling refresh_user_badge_progress after deletion:', rpcError);
          // Continue with normal refresh even if RPC fails
        }
      }
      
      // Refresh data from server to ensure consistency
      setTimeout(() => {
        console.log('Refreshing badges and profile data after entry deletion');
        loadUserBadges()
          .then(() => console.log('Badges refreshed successfully after deletion'))
          .catch(err => console.warn('Background badge refresh failed after deletion:', err));
        
        loadUserData()
          .then(() => console.log('Profile data refreshed successfully after deletion'))
          .catch(err => console.warn('Background profile refresh failed after deletion:', err));
      }, 500);
    } catch (err) {
      console.error('Error refreshing journal data:', err);
      // Don't set error state during refresh to avoid disrupting user experience
    }
    
    return result;
  }, [deleteEntry, loadUserData, loadUserBadges, user]);

  const refreshData = useCallback(async () => {
    // Check if Supabase is connected
    if (!supabase) {
      console.warn('Supabase not connected. Please connect to Supabase by clicking the "Connect to Supabase" button.');
      return;
    }
    
    // First, try to manually refresh badge progress using the database function
    try {
      if (user) {
        console.log('Manually refreshing badge progress for user:', user.id);
        await supabase.rpc('refresh_user_badge_progress', { 
          p_user_id: user.id 
        });
        console.log('Manual badge refresh completed successfully');
      }
    } catch (refreshError) {
      console.warn('Manual badge refresh failed, falling back to standard refresh:', refreshError);
    }
    
    try {
      console.log('Refreshing journal data...');
      
      // Try to manually refresh badge progress first
      if (user) {
        try {
          console.log('Calling refresh_user_badge_progress for user:', user.id);
          await supabase.rpc('refresh_user_badge_progress', {
            p_user_id: user.id
          });
          console.log('Successfully called refresh_user_badge_progress during refresh');
        } catch (rpcError) {
          console.warn('Error calling refresh_user_badge_progress during refresh:', rpcError);
          // Continue with normal refresh even if RPC fails
        }
      }
      
      await Promise.all([
        loadUserData(),
        loadUserBadges()
      ]);
      console.log('Journal data refreshed successfully via Promise.all');
    } catch (err) {
      console.error('Error refreshing journal data:', err);
    }
  }, [loadUserData, loadUserBadges, user]);

  /**
   * Get the user's current journaling streak
   * 
   * @returns {number} Current streak in days
   */
  const getStreak = (): number => {
    return profile?.current_streak || 0;
  };

  /**
   * Get the user's best journaling streak
   * 
   * @returns {number} Best streak in days
   */
  const getBestStreak = (): number => {
    return profile?.best_streak || 0;
  };

  return {
    entries,
    profile,
    badges,
    isLoading,
    error,
    isPremium,
    addEntry: handleAddEntry,
    updateEntry,
    deleteEntry: handleDeleteEntry,
    updateJournalingGoal,
    getStreak,
    getBestStreak,
    getTotalEntries,
    getLastEntryDate,
    hasEntryToday,
    refreshData
  };
}