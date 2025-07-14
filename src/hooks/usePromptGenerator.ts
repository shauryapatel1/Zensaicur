import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from './usePremium';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * Interface for prompt generation response
 * @interface PromptResponse
 */
interface PromptResponse {
  success: boolean;
  prompt: string;
  generated_by: 'ai' | 'fallback';
  error?: string;
  timestamp: string;
}

/**
 * Custom hook for generating journal prompts
 * 
 * @returns {Object} Prompt generation methods and state
 * 
 * @example
 * const { 
 *   generatePrompt, 
 *   isLoading, 
 *   error 
 * } = usePromptGenerator();
 * 
 * // Generate a prompt
 * const prompt = await generatePrompt({ mood: 'happy' });
 */
export function usePromptGenerator() {
  const { user } = useAuth();
  const { trackFeatureUsage } = usePremium();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsageCount, setDailyUsageCount] = useState(0);
  
  /**
   * Get a fallback prompt when AI service is unavailable
   * 
   * @param {string} [mood] - Optional mood to tailor the prompt
   * @param {string[]} [previousPrompts=[]] - Previously used prompts to avoid repetition
   * @returns {string} A suitable prompt
   */
  const getFallbackPrompt = (mood?: string, previousPrompts: string[] = []): string => {
    const moodBasedPrompts: Record<string, string[]> = {
      'struggling': [
        "What's one small thing that could bring you a moment of comfort today?",
        "If you could send a message of kindness to yourself right now, what would it say?",
        "What's one person or memory that makes you feel less alone?",
        "How can you be gentle with yourself today?"
      ],
      'low': [
        "What's something you're grateful for, even in this difficult moment?",
        "What would you tell a friend who was feeling the way you do right now?",
        "What's one small step you could take today to care for yourself?",
        "How have you shown strength in challenging times before?"
      ],
      'neutral': [
        "What's one thing you're curious about today?",
        "How are you feeling right now, and what might be contributing to that feeling?",
        "What's something you learned about yourself recently?",
        "What would make today feel meaningful to you?"
      ],
      'good': [
        "What's bringing you joy today, and how can you savor that feeling?",
        "How did you contribute to your own happiness today?",
        "What's something you're excited about in the near future?",
        "How can you share your positive energy with others today?"
      ],
      'amazing': [
        "What's making this such a wonderful day for you?",
        "How can you remember and recreate this feeling of joy?",
        "What would you like to celebrate about yourself today?",
        "How has your happiness impacted those around you?"
      ]
    };

    const generalPrompts = [
      "What are three things you're grateful for today, and why do they matter to you?",
      "How did you show kindness to yourself or others today?",
      "What's one small accomplishment from today that you're proud of?",
      "If you could give your past self one piece of advice, what would it be?",
      "What's something you're looking forward to, and what excites you about it?",
      "Describe a moment today when you felt most like yourself.",
      "What's one thing you learned about yourself recently that surprised you?",
      "How are you feeling right now, and what might be contributing to that feeling?",
      "What would you like to let go of today to make space for something better?",
      "What's one small moment from today that brought you joy or made you smile?"
    ];
    
    // Get mood-specific prompts or use general ones
    const availablePrompts = mood && moodBasedPrompts[mood] 
      ? [...moodBasedPrompts[mood], ...generalPrompts]
      : generalPrompts;

    // Filter out previously used prompts
    const filteredPrompts = availablePrompts.filter(prompt => 
      !previousPrompts.some(prev => prev.includes(prompt.substring(0, 20)))
    );

    // Use filtered prompts or fall back to all prompts if none available
    const promptsToUse = filteredPrompts.length > 0 ? filteredPrompts : availablePrompts;

    // Select a prompt based on the current date to ensure consistency
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return promptsToUse[dayOfYear % promptsToUse.length];
  };

  /**
   * Generate a journal prompt
   * 
   * @param {Object} [options] - Generation options
   * @param {string} [options.mood] - User's current mood
   * @param {string[]} [options.previousPrompts] - Previously used prompts to avoid repetition
   * @returns {Promise<string>} Generated prompt
   */
  const generatePrompt = async (options?: {
    mood?: string;
    previousPrompts?: string[];
  }): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    // Check if free user has reached daily limit
    if (!trackFeatureUsage('prompt-generator')) {
      const error = createAppError(
        ErrorCode.PREMIUM_DAILY_LIMIT,
        'Daily limit reached. Upgrade to Premium for unlimited prompts.',
        { feature: 'prompt-generator' }
      );
      setError(getUserFriendlyErrorMessage(error));
      setIsLoading(false);
      return getFallbackPrompt(options?.mood, options?.previousPrompts);
    }

    try {
      // Add timeout to the function call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 8000); // 8 second timeout
      });

      const functionPromise = supabase.functions.invoke('generate-prompt', {
        body: {
          name: user?.name,
          mood: options?.mood,
          previousPrompts: options?.previousPrompts || []
        }
      }).catch((networkError) => {
        // Handle network errors specifically
        if (networkError.message?.includes('Failed to fetch') || 
            networkError.name === 'TypeError' ||
            !navigator.onLine) {
          throw createAppError(
            ErrorCode.NETWORK_ERROR,
            'Unable to connect to the service. Please check your internet connection.',
            { networkError }
          );
        }
        throw networkError;
      });

      const { data, error: functionError } = await Promise.race([
        functionPromise,
        timeoutPromise
      ]) as any;

      if (functionError) {
        console.warn('Prompt generation edge function error:', functionError);
        
        // Handle different types of function errors
        let errorMessage = 'Failed to generate a personalized prompt';
        let errorDetails = { functionError };
        
        if (typeof functionError === 'string') {
          errorMessage = functionError;
        } else if (functionError && typeof functionError === 'object') {
          if (functionError.message) {
            errorMessage = functionError.message;
          } else if (functionError.error) {
            errorMessage = functionError.error;
          } else if (functionError.details) {
            errorMessage = functionError.details;
          }
        }
        
        const error = createAppError(
          ErrorCode.AI_SERVICE_UNAVAILABLE, 
          errorMessage,
          errorDetails
        );
        setError(getUserFriendlyErrorMessage(error));
        return getFallbackPrompt(options?.mood, options?.previousPrompts);
      }

      const response: PromptResponse = data;
      
      if (!response.success) {
        console.warn('Prompt generation failed:', response.error);
        const error = createAppError(
          ErrorCode.AI_GENERATION_FAILED, 
          'Failed to generate a personalized prompt',
          { response }
        );
        setError(getUserFriendlyErrorMessage(error));
        return getFallbackPrompt(options?.mood, options?.previousPrompts);
      }

      return response.prompt;
    } catch (err) {
      console.warn('Error in prompt generator:', err);
      
      // Handle specific error types
      let error;
      if (err instanceof Error) {
        if (err.message === 'Request timeout') {
          error = createAppError(
            ErrorCode.NETWORK_ERROR,
            'Request timed out. Please try again.',
            { timeout: true }
          );
        } else if (err.message?.includes('Unable to connect') || 
                   err.message?.includes('Failed to fetch')) {
          error = createAppError(
            ErrorCode.NETWORK_ERROR,
            'Unable to connect to the service. Please check your internet connection.',
            { networkError: err }
          );
        } else {
          error = createAppError(
            ErrorCode.UNKNOWN_ERROR,
            'An unexpected error occurred while generating a prompt',
            undefined, err
          );
        }
      } else {
        error = createAppError(
          ErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred while generating a prompt',
          undefined, err
        );
      }
      
      setError(getUserFriendlyErrorMessage(error));
      return getFallbackPrompt(options?.mood, options?.previousPrompts);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generatePrompt,
    isLoading,
    error,
    dailyUsageCount
  };
}