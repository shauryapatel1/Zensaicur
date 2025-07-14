import { useState, useCallback, useEffect } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceSynthesis } from './useVoiceSynthesis';
import { usePremium } from './usePremium';
import { MoodLevel } from '../types';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * A robust error handling utility to extract a message from any caught value.
 * @param error - The value caught in a catch block.
 * @returns A string representing the error message.
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Interface for journal flow state and methods
 * @interface JournalFlowHook
 */
interface JournalFlowHook {
  // State
  reflectionQuestion: string;
  isLoadingQuestion: boolean;
  selectedMood: MoodLevel | undefined;
  journalText: string;
  entryTitle: string;
  generatedAffirmation: string | null;
  generatedAffirmationSignedAudioUrl: string | null;
  isAnalyzing: boolean;
  error: string | null;
  showMoodSuggestion: boolean;
  aiDetectedMood: MoodLevel | null;
  generationProgress: number;
  audioError: string | null;
  // Methods
  fetchReflectionQuestion: () => Promise<void>;
  handleMoodSelect: (mood: MoodLevel) => void;
  handleJournalTextChange: (text: string) => void;
  handleTitleChange: (title: string) => void;
  handleAnalyzeAndSave: () => Promise<{ success: boolean; affirmationText: string | null; affirmationSource: string | null }>;
  playGeneratedAffirmation: () => Promise<{ success: boolean }>;
  stopSpeech: () => void;
  isGeneratingSpeech: boolean;
  isSpeechPlaying: boolean;
  clearError: () => void;
  resetForm: () => void;
  onAcceptAiMood: () => void;
  onDismissMoodSuggestion: () => void;
}

/**
 * Get a fallback affirmation when API fails
 */
function getFallbackAffirmation(mood: MoodLevel): string {
  const affirmations: Record<MoodLevel, string> = {
    1: 'You are stronger than you know, and this difficult moment will pass. Your feelings are valid, and you deserve compassion.',
    2: 'It\'s okay to have challenging days. You\'re human, and you\'re doing the best you can. Tomorrow brings new possibilities.',
    3: 'You are perfectly balanced in this moment. Trust in your journey and know that you are exactly where you need to be.',
    4: 'Your positive energy lights up the world around you. Keep embracing the joy that flows through your life.',
    5: 'What a beautiful soul you are! Your happiness is a gift to yourself and everyone around you. Celebrate this wonderful moment!'
  };
  return affirmations[mood] || 'You are worthy of love, happiness, and all the good things life has to offer.';
}

/**
 * Convert mood level to string representation
 */
function getMoodString(mood: MoodLevel): string {
  const moodMap: Record<MoodLevel, string> = {
    1: 'terrible',
    2: 'low',
    3: 'neutral',
    4: 'good',
    5: 'amazing'
  };
  return moodMap[mood] || 'neutral';
}

/**
 * Convert mood string to MoodLevel
 */
function convertMoodStringToLevel(moodString: string): MoodLevel {
  const moodMap: Record<string, MoodLevel> = {
    'terrible': 1,
    'low': 2,
    'neutral': 3,
    'good': 4,
    'amazing': 5
  };
  return moodMap[moodString.toLowerCase()] || 3;
}

/**
 * Fallback reflection questions when API fails
 */
const FALLBACK_PROMPTS = [
  "What are three things you're grateful for today, and why do they matter to you?",
  "How did you show kindness to yourself or others today? How did it make you feel?",
  "What challenged you today, and how did you handle it? What did you learn?",
  "What moment from today would you like to remember, and why is it significant?",
  "How are you feeling right now, and what might be contributing to that feeling?",
  "What's one thing you learned about yourself today that surprised you?",
  "If today had a theme or a title, what would it be and why?",
  "What would you like to let go of from today to make space for something better?",
  "How did you grow or change today, even in small ways?",
  "What are you looking forward to tomorrow, and how can you prepare for it?",
  "What boundaries did you set or maintain today, and how did that feel?",
  "What made you smile or laugh today? How did that affect your mood?",
  "If you could relive one moment from today, what would it be and why?",
  "What's something you're proud of accomplishing today, no matter how small?",
  "How did you take care of your physical, mental, or emotional health today?",
  "What's something you wish you had done differently today, and what would you change?",
  "What's a question you've been asking yourself lately?",
  "How did you connect with others today? What did those connections mean to you?",
  "What's something that brought you peace or comfort today?",
  "If you could give your future self advice based on today, what would it be?"
];

/**
 * Custom hook for managing the journal entry flow
 */
export function useJournalFlow(): JournalFlowHook {
  const { user } = useAuth();
  const { isPremium, isTrialActive, trackFeatureUsage } = usePremium();
  const { 
    generateSpeech, 
    playAudio, 
    isGenerating: isGeneratingSpeech, 
    isPlaying: isSpeechPlaying,
    generationProgress,
    error: audioError
  } = useVoiceSynthesis();

  // Core state
  const [reflectionQuestion, setReflectionQuestion] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
    return FALLBACK_PROMPTS[randomIndex];
  });
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodLevel | undefined>(undefined);
  const [journalText, setJournalText] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [generatedAffirmation, setGeneratedAffirmation] = useState<string | null>(null);
  const [generatedAffirmationSignedAudioUrl, setGeneratedAffirmationSignedAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoodSuggestion, setShowMoodSuggestion] = useState(false);
  const [aiDetectedMood, setAiDetectedMood] = useState<MoodLevel | null>(null);

  /**
   * Fetch a new reflection question from the API
   */
  const fetchReflectionQuestion = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    // Check if user can use this feature
    if (!trackFeatureUsage('prompt-generator')) {
      console.log('User does not have access to prompt generator');
      // Use fallback prompt
      const randomIndex = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
      setReflectionQuestion(FALLBACK_PROMPTS[randomIndex]);
      return;
    }

    setIsLoadingQuestion(true);
    setError(null);

    try {
      console.log('Fetching reflection question from Edge Function...');
      
      // Create a valid payload with only defined values
      const requestBody = {
        mood: selectedMood ? getMoodString(selectedMood) : undefined,
        name: user.name,
        previousPrompts: reflectionQuestion ? [reflectionQuestion] : []
      };
      
      // Get auth token for authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      // Direct fetch to the edge function with proper headers
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Prompt generation failed with status ${response.status}:`, errorText);
        throw new Error(`Failed to generate prompt: ${response.statusText}`);
      }
      
      const data = await response.json();
      const functionError = !data.success ? new Error(data.error || 'Failed to generate prompt') : null;

      if (functionError) {
        console.error('Edge function error generating prompt:', functionError);
        // Use fallback prompt
        const randomIndex = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
        setReflectionQuestion(FALLBACK_PROMPTS[randomIndex]);
        return;
      }
      
      console.log('Received response from generate-prompt:', data);
      
      if (data?.prompt) {
        setReflectionQuestion(data.prompt);
      } else {
        console.warn('No prompt in response data:', data);
        // Use fallback prompt
        const randomIndex = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
        setReflectionQuestion(FALLBACK_PROMPTS[randomIndex]);
      }
    } catch (err) {
      console.error('Exception fetching reflection question:', err);
      
      // Provide more detailed error logging
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      } else {
        console.error('Unknown error type:', typeof err);
      }
      
      // Use fallback prompt
      const randomIndex = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
      setReflectionQuestion(FALLBACK_PROMPTS[randomIndex]);
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [user, selectedMood, reflectionQuestion, trackFeatureUsage]);

  /**
   * Handle mood selection
   */
  const handleMoodSelect = useCallback((mood: MoodLevel) => {
    setSelectedMood(mood);
    setError(null);
  }, []);

  /**
   * Handle journal text changes
   */
  const handleJournalTextChange = useCallback((text: string) => {
    setJournalText(text);
    setError(null);
  }, []);

  /**
   * Handle title changes
   */
  const handleTitleChange = useCallback((title: string) => {
    setEntryTitle(title);
  }, []);

  /**
   * Analyze journal entry and save to database
   */
  const handleAnalyzeAndSave = useCallback(async (): Promise<{ success: boolean; affirmationText: string | null; affirmationSource: string | null }> => {
    if (!user || !journalText.trim() || !selectedMood) {
      setError('Please fill in all required fields.');
      return { success: false, affirmationText: null, affirmationSource: null };
    }

    setIsAnalyzing(true);
    setError(null);
    
    let affirmationText: string | null = null;
    let affirmationSource: string | null = null;

    try {
      // Generate affirmation
      try {
        // Get auth token for authorization header
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        // Direct fetch to the edge function with proper headers
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-affirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            entry: journalText.trim(),
            mood: getMoodString(selectedMood),
            user_id: user.id
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Affirmation generation failed with status ${response.status}:`, errorText);
          throw new Error(`Failed to generate affirmation: ${response.statusText}`);
        }
        
        const affirmationData = await response.json();
        const affirmationError = !affirmationData.success ? new Error(affirmationData.error || 'Failed to generate affirmation') : null;

        if (affirmationError || !affirmationData?.affirmation) {
          console.error('Error generating affirmation:', affirmationError);
          // Use fallback affirmation
          affirmationText = getFallbackAffirmation(selectedMood);
          affirmationSource = 'fallback';
          setGeneratedAffirmation(affirmationText);
        } else {
          affirmationText = affirmationData.affirmation;
          affirmationSource = 'ai';
          setGeneratedAffirmation(affirmationText);
        }
      } catch (affirmationErr) {
        console.error('Error generating affirmation:', affirmationErr);
        // Use fallback affirmation
        affirmationText = getFallbackAffirmation(selectedMood);
        affirmationSource = 'fallback';
        setGeneratedAffirmation(affirmationText);
      }

      // Reset form
      setJournalText('');
      setEntryTitle('');
      setSelectedMood(undefined);
      
      return { success: true, affirmationText, affirmationSource };
    } catch (err) {
      console.error('Error in handleAnalyzeAndSave:', err);
      setError(getErrorMessage(err));
      return { success: false, affirmationText: null, affirmationSource: null };
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, journalText, selectedMood, entryTitle]);

  /**
   * Play generated affirmation as speech
   */
  const playGeneratedAffirmation = useCallback(async (): Promise<{ success: boolean }> => {
    if (!generatedAffirmation) {
      return { success: false };
    }

    try {
      if (generatedAffirmationSignedAudioUrl) {
        // Play existing audio
        console.log('Playing existing audio from URL:', generatedAffirmationSignedAudioUrl);
        await playAudio(generatedAffirmationSignedAudioUrl);
        return { success: true };
      } else {
        // Generate and play new audio
        console.log('No existing audio URL, generating new speech');
        const audioUrl = await generateSpeech(generatedAffirmation);
        if (audioUrl) {
          console.log('Generated new audio URL:', audioUrl);
          setGeneratedAffirmationSignedAudioUrl(audioUrl);
          await playAudio(audioUrl);
          return { success: true };
        }
      }
    } catch (err) {
      console.error('Error playing affirmation:', err instanceof Error ? err.message : String(err));
    }

    return { success: false };
  }, [generatedAffirmation, generatedAffirmationSignedAudioUrl, generateSpeech, playAudio]);

  /**
   * Stop speech playback
   */
  const stopSpeech = useCallback(() => {
    // stopAudio(); // This line was removed from destructuring, so it's removed here.
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setJournalText('');
    setEntryTitle('');
    setSelectedMood(undefined);
    setGeneratedAffirmation(null);
    setGeneratedAffirmationSignedAudioUrl(null);
    setError(null);
    setShowMoodSuggestion(false);
    setAiDetectedMood(null);
  }, []);

  /**
   * Accept AI mood suggestion
   */
  const onAcceptAiMood = useCallback(() => {
    if (aiDetectedMood) {
      setSelectedMood(aiDetectedMood);
    }
    setShowMoodSuggestion(false);
  }, [aiDetectedMood]);

  /**
   * Dismiss AI mood suggestion
   */
  const onDismissMoodSuggestion = useCallback(() => {
    setShowMoodSuggestion(false);
    setAiDetectedMood(null);
  }, []);

  return {
    // State
    reflectionQuestion,
    isLoadingQuestion,
    selectedMood,
    journalText,
    entryTitle,
    generatedAffirmation,
    generatedAffirmationSignedAudioUrl,
    isAnalyzing,
    error,
    showMoodSuggestion,
    aiDetectedMood,
    generationProgress,
    audioError,
    
    // Methods
    fetchReflectionQuestion,
    handleMoodSelect,
    handleJournalTextChange,
    handleTitleChange,
    handleAnalyzeAndSave,
    playGeneratedAffirmation,
    stopSpeech,
    isGeneratingSpeech,
    isSpeechPlaying,
    clearError,
    resetForm,
    onAcceptAiMood,
    onDismissMoodSuggestion,
  };
}