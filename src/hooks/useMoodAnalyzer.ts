import { useState } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * Interface for mood analysis response
 * @interface MoodAnalysisResponse
 */
interface MoodAnalysisResponse {
  success: boolean;
  mood: string;
  confidence?: number;
  analysis?: string;
  error?: string;
  timestamp: string;
}

/**
 * Simple keyword-based mood analysis as fallback
 */
const analyzeTextMood = (text: string): MoodLevel => {
  const lowerText = text.toLowerCase();
  
  // Count positive and negative indicators
  const positiveWords = [
    'happy', 'joy', 'excited', 'amazing', 'wonderful', 'great', 'fantastic', 
    'love', 'blessed', 'grateful', 'thankful', 'proud', 'accomplished',
    'successful', 'confident', 'optimistic', 'hopeful', 'cheerful', 'delighted'
  ];
  
  const negativeWords = [
    'sad', 'depressed', 'anxious', 'worried', 'stressed', 'overwhelmed',
    'angry', 'frustrated', 'disappointed', 'hopeless', 'terrible', 'awful',
    'hate', 'miserable', 'exhausted', 'lonely', 'scared', 'panic', 'crisis'
  ];
  
  const neutralWords = [
    'okay', 'fine', 'normal', 'regular', 'usual', 'average', 'typical',
    'routine', 'standard', 'ordinary', 'calm', 'peaceful', 'quiet'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveScore++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeScore++;
  });
  
  neutralWords.forEach(word => {
    if (lowerText.includes(word)) neutralScore++;
  });
  
  // Determine mood based on scores
  if (negativeScore > positiveScore) {
    return negativeScore >= 2 ? 1 : 2; // struggling or low
  } else if (positiveScore > negativeScore) {
    return positiveScore >= 2 ? 5 : 4; // amazing or good
  } else {
    return 3; // neutral
  }
};

/**
 * Custom hook for analyzing mood from journal text
 * 
 * @returns {Object} Mood analysis methods and state
 * 
 * @example
 * const { 
 *   analyzeMood, 
 *   isAnalyzing, 
 *   error 
 * } = useMoodAnalyzer();
 * 
 * // Analyze mood from text
 * const detectedMood = await analyzeMood("I'm feeling great today!");
 */
export function useMoodAnalyzer() {
  const { user } = useAuth();
  const { isPremium, trackFeatureUsage } = usePremium();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);

  /**
   * Analyze mood from journal text
   * 
   * @param {string} journalEntry - Text to analyze
   * @returns {Promise<MoodLevel|null>} Detected mood level or null on failure
   */
  const analyzeMood = async (journalEntry: string): Promise<MoodLevel | null> => {
    if (!journalEntry.trim()) {
      const error = createAppError(
        ErrorCode.VALIDATION_ERROR,
        'Journal entry is required for mood analysis'
      );
      setError(getUserFriendlyErrorMessage(error));
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    // Check if free user has reached daily limit
    if (!trackFeatureUsage('mood-analyzer')) {
      const error = createAppError(
        ErrorCode.PREMIUM_DAILY_LIMIT,
        'Daily limit reached. Upgrade to Premium for unlimited mood analysis.',
        { feature: 'mood-analyzer' }
      );
      setError(getUserFriendlyErrorMessage(error));
      setIsAnalyzing(false);
      return null;
    }

    try {
      // Add timeout to the function call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000); // 8 second timeout
      });

      // Create payload with only defined values
      const payload = {
          entry: journalEntry.trim(),
          name: user?.name || null
      };
      
      // Get auth token for authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      console.log('Sending payload to analyze-mood:', payload);
      
      // Direct fetch to the edge function with proper headers
      const functionPromise = fetch(`${SUPABASE_FUNCTIONS_URL}/analyze-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload)
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Mood analysis failed with status ${response.status}:`, errorText);
          throw new Error(`Failed to analyze mood: ${response.statusText}`);
        }
        return response.json();
      });

      const { data, error: functionError } = await Promise.race([
        functionPromise,
        timeoutPromise
      ]) as any;

      if (functionError) {
        console.warn('Mood analysis edge function error, using fallback:', 
          functionError instanceof Error ? functionError.message : String(functionError));
        // Use fallback text analysis instead of failing
        return analyzeTextMood(journalEntry.trim());
      }

      const response: MoodAnalysisResponse = data;
      
      if (!response.success) {
        console.warn('AI mood analysis failed, using fallback:', response.error);
        // Use fallback text analysis instead of just returning neutral
        return analyzeTextMood(journalEntry.trim());
      }

      // Convert mood string to MoodLevel
      const moodLevel = convertMoodStringToLevel(response.mood);
      return moodLevel;
    } catch (err) {
      console.warn('Error calling mood analyzer, using fallback:', err);
      // Use fallback text analysis instead of failing completely
      return analyzeTextMood(journalEntry.trim());
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeMood,
    isAnalyzing,
    error,
    dailyUsageCount
  };
}

/**
 * Helper function to convert mood string to MoodLevel
 * 
 * @param {string} mood - Mood string from API
 * @returns {MoodLevel} Numeric mood level (1-5)
 */
function convertMoodStringToLevel(mood: string): MoodLevel {
  const normalizedMood = mood.toLowerCase().trim();
  
  // Direct matches
  switch (normalizedMood) {
    case 'struggling':
      return 1;
    case 'low':
      return 2;
    case 'neutral':
      return 3;
    case 'good':
      return 4;
    case 'amazing':
      return 5;
  }
  
  // Handle variations and synonyms
  if (normalizedMood.includes('depress') || normalizedMood.includes('despair') || 
      normalizedMood.includes('hopeless') || normalizedMood.includes('overwhelm') ||
      normalizedMood.includes('anxious') || normalizedMood.includes('panic') ||
      normalizedMood.includes('stressed') || normalizedMood.includes('terrible')) {
    return 1; // struggling
  }
  
  if (normalizedMood.includes('sad') || normalizedMood.includes('down') || 
      normalizedMood.includes('disappoint') || normalizedMood.includes('melancholy') ||
      normalizedMood.includes('blue') || normalizedMood.includes('upset') ||
      normalizedMood.includes('worried') || normalizedMood.includes('concern')) {
    return 2; // low
  }
  
  if (normalizedMood.includes('happy') || normalizedMood.includes('joy') || 
      normalizedMood.includes('pleased') || normalizedMood.includes('content') ||
      normalizedMood.includes('satisfied') || normalizedMood.includes('positive') ||
      normalizedMood.includes('optimistic') || normalizedMood.includes('hopeful') ||
      normalizedMood.includes('cheerful') || normalizedMood.includes('upbeat')) {
    return 4; // good
  }
  
  if (normalizedMood.includes('ecstatic') || normalizedMood.includes('elated') || 
      normalizedMood.includes('thrilled') || normalizedMood.includes('euphoric') ||
      normalizedMood.includes('fantastic') || normalizedMood.includes('wonderful') ||
      normalizedMood.includes('excellent') || normalizedMood.includes('brilliant') ||
      normalizedMood.includes('incredible') || normalizedMood.includes('overjoyed')) {
    return 5; // amazing
  }
  
  // Default to neutral for unrecognized emotions
  return 3;
}