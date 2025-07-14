import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as Sentry from '@sentry/react';
import { withRetry } from '../utils/networkUtils';
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
  signedPhotoUrl?: string;
  affirmation_text?: string | null;
  affirmation_audio_url?: string | null;
  affirmation_source?: string | null;
  signedAudioUrl?: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for add entry result
 * @interface AddEntryResult
 */
interface AddEntryResult {
  success: boolean;
  error?: string;
}

/**
 * Custom hook for managing journal entries CRUD operations
 * 
 * @returns {Object} Journal entries methods and state
 * 
 * @example
 * const { 
 *   entries, 
 *   loadEntries,
 *   addEntry, 
 *   updateEntry,
 *   deleteEntry
 * } = useJournalEntries();
 */
export function useJournalEntries() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium, isTrialActive } = usePremium();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load journal entries from Supabase and generate signed URLs
   * THIS IS THE DEFINITIVE FIX FOR AUDIO PLAYBACK
   * 
   * @param {boolean} isTrialActive - Whether user has active trial
   * @returns {Promise<void>}
   */
  const loadEntries = useCallback(async (isTrialActive?: boolean) => {
    if (!user) return;

    // Check if Supabase is connected
    if (!supabase) {
      console.warn('Supabase not connected. Please connect to Supabase first.');
      setIsLoading(false);
      return;
    }

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Loading journal entries',
      level: 'info'
    });
    
    console.log('loadEntries: Fetching entries...');
    try {
      setIsLoading(true);
      setError(null);

      // Test Supabase connection first
      try {
        // Simple connection test without complex error handling
        const { data, error: connectionError } = await supabase
          .from('journal_entries')
          .select('id', { head: true })
          .eq('user_id', user.id)
          .limit(0);
        
        if (connectionError && connectionError.code !== 'PGRST116') {
          console.error('Connection test failed:', connectionError);
          throw connectionError;
        }
      } catch (connError: any) {
        console.error('Supabase connection test failed:', connError);
        
        // Provide more specific error messages based on error type
        if (connError instanceof TypeError && connError.message === 'Failed to fetch') {
          throw new Error('Unable to connect to Supabase. Please check:\n1. Your internet connection\n2. That your Supabase project is active\n3. Your .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values\n4. No VPN or firewall is blocking the connection');
        }
        
        if (connError.name === 'AbortError') {
          throw new Error('Connection timed out. Please check your internet connection and try again.');
        }
        
        throw connError;
      }

      // For free users, limit to 30 days or 30 entries
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!isPremium && !isTrialActive) {
        // Get entries from the last 30 days or the most recent 30 entries
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        query = query
          .gt('created_at', thirtyDaysAgo.toISOString())
          .limit(30);
      }

      const { data: entriesData, error } = await query;

      if (error) {
        console.error('Error loading entries:', error);
        throw new Error(`Failed to load journal entries: ${error.message}`);
      }

      console.log('loadEntries: Fetched entries:', entriesData.length);

      // Process entries to generate signed URLs for photos and audio
      const entriesWithSignedUrls = await Promise.all(
        entriesData.map(async (entry) => {
          let processedEntry = { ...entry };

          // Process photo URL if exists
          if (entry.photo_url) {
            try {
              // Extract the relative path from the photo_url
              let relativePath = entry.photo_url;
              if (entry.photo_url.startsWith('http')) {
                const pathMatch = entry.photo_url.match(/\/journal-photos\/(.+)$/);
                if (pathMatch) {
                  relativePath = pathMatch[1];
                } else {
                  console.warn(`Could not extract path from URL: ${entry.photo_url}`);
                }
              }

              // Generate signed URL for private bucket access with retry
              const signedUrlData = await withRetry(async () => {
                const { data, error: urlError } = await supabase.storage
                  .from('journal-photos')
                  .createSignedUrl(relativePath, 3600); // Valid for 1 hour

                if (urlError) {
                  throw urlError;
                }

                return data;
              }, `Generate signed URL for photo ${relativePath}`);

              processedEntry.signedPhotoUrl = signedUrlData.signedUrl;
            } catch (error) {
              console.warn(`Failed to create signed URL for photo ${entry.photo_url} after retries:`, error);
              processedEntry.signedPhotoUrl = null;
            }
          }
          
          // Process affirmation audio URL if exists - THIS IS THE CRITICAL FIX
          if (entry.affirmation_audio_url) {
            try {
              // Extract the relative path from the affirmation_audio_url
              let relativePath = entry.affirmation_audio_url;
              if (entry.affirmation_audio_url.startsWith('http')) {
                const pathMatch = entry.affirmation_audio_url.match(/\/affirmation-audio\/(.+)$/);
                if (pathMatch) {
                  relativePath = pathMatch[1];
                } else {
                  console.warn(`Could not extract path from URL: ${entry.affirmation_audio_url}`);
                }
              } else {
                // If it's already a relative path, use it as-is
                // Remove any leading slash if present
                relativePath = entry.affirmation_audio_url.replace(/^\/+/, '');
              }
              
              // Generate signed URL for affirmation audio - THIS CREATES THE PLAYABLE URL
              const signedAudioData = await withRetry(async () => {
                const { data, error: urlError } = await supabase.storage
                  .from('affirmation-audio')
                  .createSignedUrl(relativePath, 3600); // Valid for 1 hour
                
                if (urlError) {
                  console.warn(`Failed to create signed URL for audio path "${entry.affirmation_audio_url}":`, urlError);
                  throw urlError;
                }
                
                return data;
              }, `Generate signed URL for audio ${relativePath}`);
              
              // THIS IS THE KEY: Store the playable signed URL
              processedEntry.signedAudioUrl = signedAudioData.signedUrl;
              console.log(`Generated signed audio URL for entry ${entry.id}:`, signedAudioData.signedUrl);
            } catch (error) {
              console.warn(`Error processing audio for entry ${entry.id}:`, error);
              // Set signedAudioUrl to null so the component knows there's no valid audio URL
              processedEntry.signedAudioUrl = null;
            }
          }
          
          return processedEntry;
        })
      );

      setEntries(entriesWithSignedUrls);
      console.log('loadEntries: Processed and set entries:', entriesWithSignedUrls.length);
    } catch (err) {
      // Capture the error with additional context
      Sentry.captureException(err, {
        tags: {
          section: 'journal',
          operation: 'loadEntries'
        },
        extra: {
          userId: user.id,
          isPremium,
          isTrialActive
        }
      });
      
      console.error('Error loading entries:', err);
      
      // Provide specific error messages based on error type
      if (err instanceof TypeError && err.message?.includes('Failed to fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err?.code === 'PGRST301') {
        setError('Database connection issue. Please try again in a moment.');
      } else {
        setError('An unexpected error occurred while loading entries. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isPremium, isTrialActive]);

  /**
   * Add a new journal entry
   * 
   * @param {string} content - Journal entry content
   * @param {string|null} title - Optional entry title
   * @param {MoodLevel} mood - Selected mood level
   * @param {File} [photoFile] - Optional photo attachment
   * @returns {Promise<AddEntryResult>} Result object
   */
  const addEntry = async (
    content: string, 
    title: string | null,
    mood: MoodLevel,
    photoFile?: File | null,
    affirmationText?: string | null,
    affirmationAudioUrl?: string | null, 
    affirmationSource?: string | null
  ): Promise<AddEntryResult> => {
    if (!user || !isAuthenticated) {
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.NOT_AUTHENTICATED,
          'You must be logged in to save entries'
        ))
      };
    }

    // Check if Supabase is connected
    if (!supabase) {
      return { 
        success: false, 
        error: 'Database not connected. Please connect to Supabase first.'
      };
    }

    if (!content?.trim()) {
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.JOURNAL_ENTRY_EMPTY,
          'Entry content cannot be empty'
        ))
      };
    }

    try {
      setError(null);

      // Convert mood level to string
      const moodString = getMoodString(mood);
      
      let photoUrl = null;
      let photoFilename = null;

      // Check if user can upload photos (premium or trial)
      const canUploadPhotos = isPremium || isTrialActive;
      
      // Handle photo upload if provided and user has permission
      if (photoFile && canUploadPhotos) {
        try {
          console.log('Uploading photo:', photoFile.name);
          
          // Generate unique filename
          const timestamp = Date.now();
          const fileExt = photoFile.name.split('.').pop()?.toLowerCase();
          const fileName = `${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          // Upload to Supabase Storage with retry
          await withRetry(async () => {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('journal-photos')
              .upload(fileName, photoFile, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              throw uploadError;
            }

            return uploadData;
          }, 'Upload photo');

          photoUrl = fileName; // Store the file path, not the public URL
          console.log('Photo uploaded successfully:', photoUrl);
          photoFilename = photoFile.name;
        } catch (photoError) {
          console.error('Photo processing error:', photoError);
          return { 
            success: false, 
            error: getUserFriendlyErrorMessage(createAppError(
              ErrorCode.MEDIA_UPLOAD_FAILED,
              'Failed to process photo. Please try again.',
              undefined,
              photoError
            ))
          };
        }
      }

      // Insert journal entry
      console.log('Saving journal entry with photo:', photoUrl ? 'Yes' : 'No');
      
      // Log affirmation data
      console.log('Saving journal entry with affirmation:', {
        hasAffirmationText: !!affirmationText,
        hasAffirmationAudioUrl: !!affirmationAudioUrl, 
        affirmationSource: affirmationSource || 'not specified'
      });
      
      const entryData = await withRetry(async () => {
        const { data, error: entryError } = await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            content: content.trim(),
            title: title?.trim() || null,
            mood: moodString,
            photo_url: photoUrl,
            photo_filename: photoFilename,
            affirmation_text: affirmationText,
            affirmation_audio_url: affirmationAudioUrl,
            affirmation_source: affirmationSource
          })
          .select()
          .single();

        if (entryError) {
          throw entryError;
        }

        return data;
      }, 'Save journal entry');

      // Update local state
      setEntries(prev => {
        // Make sure we don't add duplicates
        // IMPORTANT: Create a new array to ensure React detects the state change
        const newEntries = [entryData, ...prev.filter(entry => entry.id !== entryData.id)];
        console.log('Updated entries state with new entry. Total entries:', newEntries.length);
        return newEntries;
      });

      return { success: true };
    } catch (err) {
      console.error('Error adding entry:', err);
      
      // Provide specific error messages for network issues
      if (err instanceof TypeError && err.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Unable to connect to the server. Please check your internet connection and try again.'
        };
      }
      
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred. Please try again.',
          undefined,
          err
        ))
      };
    }
  };

  /**
   * Update an existing journal entry
   * 
   * @param {string} entryId - ID of the entry to update
   * @param {Partial<JournalEntry>} updates - Object containing fields to update
   * @param {string} [affirmationText] - Updated affirmation text (optional)
   * @param {string} [affirmationAudioUrl] - Updated affirmation audio URL (optional)
   * @param {File} [photoFile] - New photo (optional)
   * @param {boolean} [removePhoto] - Whether to remove existing photo
   * @returns {Promise<AddEntryResult>} Result object
   */
  const updateEntry = async (
    entryId: string, 
    updates: any,
    affirmationText?: string | null,
    affirmationAudioUrl?: string | null,
    photoFile?: File,
    removePhoto?: boolean
  ): Promise<AddEntryResult> => {
    if (!user || !isAuthenticated) {
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.NOT_AUTHENTICATED,
          'You must be logged in to update entries'
        ))
      };
    }

    // Check if Supabase is connected
    if (!supabase) {
      return { 
        success: false, 
        error: 'Database not connected. Please connect to Supabase first.'
      };
    }

    // Validate content if provided
    if (updates.content !== undefined && !updates.content?.trim()) {
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.JOURNAL_ENTRY_EMPTY,
          'Entry content cannot be empty'
        ))
      };
    }

    try {
      setError(null);

      // Get current entry
      const currentEntry = entries.find(e => e.id === entryId);
      if (!currentEntry) {
        return { 
          success: false, 
          error: getUserFriendlyErrorMessage(createAppError(
            ErrorCode.JOURNAL_ENTRY_NOT_FOUND,
            'Entry not found'
          ))
        };
      }

      // Check if user can upload photos (premium or trial)
      const canUploadPhotos = isPremium || isTrialActive;
      
      let photoUrl = null;
      let photoFilename = null;
      
      if (removePhoto && currentEntry?.photo_url && canUploadPhotos) {
        // Delete existing photo from storage
        try {
          const fileName = currentEntry.photo_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('journal-photos')
              .remove([`${user.id}/${fileName}`]);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old photo:', deleteError);
        }
        photoUrl = null;
        photoFilename = null;
      } else if (photoFile && canUploadPhotos) {
        // Upload new photo
        try {
          // Delete old photo if exists
          if (currentEntry?.photo_url) {
            const oldFileName = currentEntry.photo_url.split('/').pop();
            if (oldFileName) {
              await supabase.storage
                .from('journal-photos')
                .remove([`${user.id}/${oldFileName}`]);
            }
          }
          
          // Upload new photo
          const timestamp = Date.now();
          const fileExt = photoFile.name.split('.').pop()?.toLowerCase();
          const fileName = `${user.id}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('journal-photos')
            .upload(fileName, photoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            return { 
              success: false, 
              error: getUserFriendlyErrorMessage(createAppError(
                ErrorCode.MEDIA_UPLOAD_FAILED,
                'Failed to upload photo. Please try again.',
                { uploadError }
              ))
            };
          }

          // Get public URL
          photoUrl = fileName; // Store the file path, not the public URL
          photoFilename = photoFile.name;
        } catch (photoError) {
          console.error('Photo processing error:', photoError);
          return { 
            success: false, 
            error: getUserFriendlyErrorMessage(createAppError(
              ErrorCode.MEDIA_UPLOAD_FAILED,
              'Failed to process photo. Please try again.',
              undefined, photoError
            ))
          };
        }
      } else {
        // Keep existing photo
        photoUrl = currentEntry?.photo_url || null;
        photoFilename = currentEntry?.photo_filename || null;
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
        ...updates
      };
      
      // Convert mood to string if provided
      if (updates.mood !== undefined && typeof updates.mood === 'number') {
        updateData.mood = getMoodString(updates.mood as MoodLevel);
      }
      
      // Trim content if provided
      if (updates.content !== undefined) {
        updateData.content = updates.content.trim();
      }
      
      // Trim title if provided
      if (updates.title !== undefined) {
        updateData.title = updates.title?.trim() || null;
      }
      
      // Only update photo fields if they were explicitly changed
      if ((removePhoto || photoFile) && canUploadPhotos) {
        updateData.photo_url = photoUrl;
        updateData.photo_filename = photoFilename;
      }

      // Update journal entry
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating entry:', updateError);
        return { 
          success: false, 
          error: getUserFriendlyErrorMessage(createAppError(
            ErrorCode.JOURNAL_UPDATE_FAILED,
            'Failed to update your journal entry. Please try again.',
            { updateError }
          ))
        };
      }

      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, ...updateData }
          : entry
      ));

      return { success: true };
    } catch (err) {
      console.error('Error updating entry:', err);
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred. Please try again.',
          undefined, err
        ))
      };
    }
  };

  /**
   * Delete a journal entry
   * 
   * @param {string} entryId - ID of the entry to delete
   * @returns {Promise<AddEntryResult>} Result object
   */
  const deleteEntry = async (entryId: string): Promise<AddEntryResult> => {
    if (!user || !isAuthenticated) {
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.NOT_AUTHENTICATED,
          'You must be logged in to delete entries'
        ))
      };
    }

    // Check if Supabase is connected
    if (!supabase) {
      return { 
        success: false, 
        error: 'Database not connected. Please connect to Supabase first.'
      };
    }

    try {
      setError(null);
      
      // Get entry to check for photo
      const entryToDelete = entries.find(e => e.id === entryId);
      
      // Delete photo from storage if exists
      if (entryToDelete?.photo_url) {
        try {
          const fileName = entryToDelete.photo_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('journal-photos')
              .remove([`${user.id}/${fileName}`]);
          }
        } catch (deleteError) {
          console.warn('Failed to delete photo:', deleteError);
        }
      }

      // Delete journal entry from database
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting entry:', deleteError);
        return { 
          success: false, 
          error: getUserFriendlyErrorMessage(createAppError(
            ErrorCode.JOURNAL_DELETE_FAILED,
            'Failed to delete your journal entry. Please try again.',
            { deleteError }
          ))
        };
      }

      // Update local state
      setEntries(prev => prev.filter(entry => entry.id !== entryId));

      return { success: true };
    } catch (err) {
      console.error('Error deleting entry:', err);
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(createAppError(
          ErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred. Please try again.',
          undefined, err
        ))
      };
    }
  };

  return {
    entries,
    isLoading,
    error,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry
  };
}

/**
 * Helper function to convert mood level to descriptive string
 * 
 * @param {MoodLevel} mood - Numeric mood level (1-5)
 * @returns {string} String representation of mood
 */
function getMoodString(mood: MoodLevel): string {
  switch (mood) {
    case 1:
      return 'struggling';
    case 2:
      return 'low';
    case 3:
      return 'neutral';
    case 4:
      return 'good';
    case 5:
      return 'amazing';
    default:
      return 'neutral';
  }
}