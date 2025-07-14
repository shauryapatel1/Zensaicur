import { useState } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * Interface for affirmation generation response
 * @interface AffirmationResponse
 */
interface AffirmationResponse {
  success: boolean;
  affirmation: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

/**
 * Fallback affirmations for when AI generation fails
 */
const FALLBACK_AFFIRMATIONS: Record<MoodLevel, string[]> = {
  1: [
    'You are stronger than you know, and this difficult moment will pass. Your feelings are valid, and you deserve compassion.',
    'Even in your darkest moments, you carry a light within you that cannot be extinguished. You are worthy of love and support.',
    'It\'s okay to not be okay. Your struggles don\'t define you - your resilience does. Take it one breath at a time.'
  ],
  2: [
    'It\'s okay to have challenging days. You\'re human, and you\'re doing the best you can. Tomorrow brings new possibilities.',
    'Your feelings are temporary visitors, not permanent residents. You have weathered storms before and you will again.',
    'Be gentle with yourself today. Small steps forward are still progress, and you are moving in the right direction.'
  ],
  3: [
    'You are perfectly balanced in this moment. Trust in your journey and know that you are exactly where you need to be.',
    'In this neutral space, you have the power to choose your next step. Your potential is limitless.',
    'Sometimes the most profound growth happens in quiet moments like these. You are becoming who you\'re meant to be.'
  ],
  4: [
    'Your positive energy lights up the world around you. Keep embracing the joy that flows through your life.',
    'You are a beacon of hope and happiness. Your good mood is a gift to yourself and everyone you encounter.',
    'Celebrate this beautiful feeling! You deserve all the happiness that comes your way.'
  ],
  5: [
    'What a beautiful soul you are! Your happiness is a gift to yourself and everyone around you. Celebrate this wonderful moment!',
    'Your joy is contagious and your spirit is radiant. You are living proof that life is full of amazing possibilities.',
    'You are absolutely glowing with happiness! This energy you carry is a testament to your beautiful heart and positive spirit.'
  ]
};

/**
 * Custom hook for generating personalized affirmations
 * 
 * @returns {Object} Affirmation generation methods and state
 * 
 * @example
 * const { 
 *   generateAffirmation, 
 *   isGenerating, 
 *   error 
 * } = useAffirmationGenerator();
 * 
 * // Generate an affirmation
 * const affirmation = await generateAffirmation("I'm feeling proud of my progress", 4);
 */
export function useAffirmationGenerator() {
  const { user } = useAuth();
  const { trackFeatureUsage } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  /**
   * Get a random fallback affirmation for the given mood
   */
  const getFallbackAffirmation = (mood: MoodLevel): string => {
    const affirmations = FALLBACK_AFFIRMATIONS[mood] || FALLBACK_AFFIRMATIONS[3];
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    return affirmations[randomIndex];
  };

  /**
   * Generate a personalized affirmation based on journal content and mood
   * 
   * @param {string} journalEntry - Journal entry text
   * @param {MoodLevel} mood - User's mood level
   * @returns {Promise<string|null>} Generated affirmation or null on failure
   */
  const generateAffirmation = async (
    journalEntry: string, 
    mood: MoodLevel
  ): Promise<string | null> => {
    if (!journalEntry?.trim()) {
      const error = createAppError(
        ErrorCode.VALIDATION_ERROR,
        'Journal entry is required for affirmation generation'
      );
      setError(getUserFriendlyErrorMessage(error));
      return null;
    }

    setIsGenerating(true);
    setError(null);

    // Check if free user has reached daily limit
    if (!trackFeatureUsage('affirmation-generator')) {
      const error = createAppError(
        ErrorCode.PREMIUM_DAILY_LIMIT,
        'Daily limit reached. Upgrade to Premium for unlimited affirmations.',
        { feature: 'affirmation-generator' }
      );
      setError(getUserFriendlyErrorMessage(error));
      setIsGenerating(false);
      return null;
    }

    try {
      // Convert mood level to string
      const moodString = getMoodString(mood);

      // Add timeout to the function call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      // Create payload with only defined values
      const payload = {
          entry: journalEntry.trim(),
          mood: moodString,
          name: user?.name || null
      };
      
      // Get auth token for authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      console.log('Sending payload to generate-affirmation:', payload);
      
      // Direct fetch to the edge function with proper headers
      const functionPromise = fetch(`${SUPABASE_FUNCTIONS_URL}/generate-affirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload)
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Affirmation generation failed with status ${response.status}:`, errorText);
          throw new Error(`Failed to generate affirmation: ${response.statusText}`);
        }
        return response.json();
      });

      const { data, error: functionError } = await Promise.race([
        functionPromise,
        timeoutPromise
      ]) as any;

      if (functionError) {
        console.warn('Affirmation generation edge function error, using fallback:', functionError);
        // Return fallback affirmation instead of failing
        return getFallbackAffirmation(mood);
      }

      const response: AffirmationResponse = data;
      
      if (!response.success) {
        console.warn('AI affirmation generation failed, using fallback:', response.error);
        // Return fallback affirmation instead of the potentially empty response
        return getFallbackAffirmation(mood);
      }

      return response.affirmation;
    } catch (err) {
      console.warn('Error calling affirmation generator, using fallback:', err);
      // Return fallback affirmation instead of failing completely
      return getFallbackAffirmation(mood);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateAffirmation,
    isGenerating,
    error,
    dailyUsageCount
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