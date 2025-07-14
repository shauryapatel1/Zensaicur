import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../lib/supabase';
import { usePremium } from './usePremium';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

/**
 * Interface for voice synthesis settings
 * @interface VoiceSettings
 */
interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * Custom hook for text-to-speech functionality
 * 
 * @returns {Object} Voice synthesis methods and state
 */
export function useVoiceSynthesis() {
  const { trackFeatureUsage } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep track of created object URLs to clean them up
  const objectUrlRef = useRef<string | null>(null);

  /**
   * Generate speech from text and return the storage path
   * 
   * @param {string} text - Text to convert to speech
   * @param {boolean} [saveToStorage=false] - Whether to save the audio to storage
   * @param {string} [userId] - User ID for storage path (required if saveToStorage is true)
   * @returns {Promise<string|null>} Storage path or null on failure
   */
  const generateSpeech = useCallback(async (
    text: string,
    saveToStorage: boolean = false,
    userId?: string | null
  ): Promise<string | null> => {
    // Validate and trim text
    setIsProcessing(true);
    const trimmedText = text?.trim();
    if (!trimmedText) {
      setError('Text is required for speech generation');
      setIsProcessing(false);
      return null;
    }

    // Limit text length to prevent request issues
    const maxLength = 1000;
    const processedText = trimmedText.length > maxLength 
      ? trimmedText.substring(0, maxLength) + "..." 
      : trimmedText;
    
    // Check if user has premium access
    if (!trackFeatureUsage('voice-synthesis', 1)) {
      setError('Daily limit reached. Upgrade to Premium for unlimited voice playback.');
      setIsProcessing(false);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('Generating speech with options:', { 
        saveToStorage, 
        userId: userId ? 'provided' : 'not provided',
        textLength: processedText.length
      });
      
      // Get auth token for authorization header
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // Direct fetch to the edge function with proper headers
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          text: processedText,
          save_to_storage: saveToStorage,
          user_id: userId
        })
      });

      // Check if the response is JSON (for storage path) or binary (for direct audio)
      const contentType = response.headers.get('Content-Type') || '';
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Speech generation failed with status ${response.status}:`, errorText);
        throw new Error(`Speech generation failed: ${response.statusText}`);
      }

      // If response is JSON, it contains the storage path
      if (contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to generate speech');
        }
        
        console.log('Speech generated successfully with storage path:', data.audio_url);
        
        // Return the storage path
        if (saveToStorage && data.audio_url) {
          return data.audio_url;
        }
        
        return null;
      }
      
      // If we get here, something went wrong
      const functionError = new Error('Unexpected response format from speech generation');
      console.error('Speech generation error:', functionError);
      throw functionError;
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to generate speech');
      }
      
      return null;
    } catch (err) {
      console.error('Error generating speech:', err);
      setError('Failed to generate speech. Please try again.');
      setIsProcessing(false);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [trackFeatureUsage]);

  /**
   * Play audio from a URL
   * 
   * @param {string} url - URL of the audio to play
   * @returns {Promise<{success: boolean}>} Success status
   */
  const playAudio = useCallback(async (url: string): Promise<{success: boolean}> => {
    if (!url) {
      setError('No audio URL provided');
      setIsProcessing(false);
      return { success: false };
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Clean up any existing object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    
    setError(null);
    setAudioUrl(url);

    setIsProcessing(true);
    try {
      // Create and play audio from the URL
      console.log('Attempting to play audio from URL:', url);
      
      // For Supabase Storage URLs, ensure we're using the signed URL
      if (url.includes('/storage/v1/object/sign/')) {
        console.log('Using signed URL for playback');
      }
      const audio = new Audio(url);
      audioRef.current = audio;

      // Set up audio event listeners
      audio.addEventListener('canplay', () => {
        setIsPlaying(true);
        setIsProcessing(true);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setIsProcessing(false);
        audioRef.current = null;
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio. The file may be corrupted or unavailable.');
        setIsPlaying(false);
        setIsProcessing(false);
        audioRef.current = null;
      });

      // Start loading the audio
      audio.load();
      
      // Try to play it
      try {
        await audio.play();
        return { success: true };
      } catch (playError) {
        console.error('Audio play error:', playError);
        setError('Failed to play audio. Please check your browser settings.');
        setIsPlaying(false);
        setIsProcessing(false);
        return { success: false };
      }
    } catch (err) {
      console.error('Error setting up audio playback:', err);
      setError('An unexpected error occurred during audio setup');
      setIsProcessing(false);
      return { success: false };
    }
  }, []);

  /**
   * Stop audio playback
   */
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      
      // Clean up object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setIsPlaying(false);
      setIsProcessing(false);
    }
  }, []);

  /**
   * Clear any error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update isProcessing whenever isGenerating or isPlaying changes
  useEffect(() => {
    setIsProcessing(isGenerating || isPlaying);
  }, [isGenerating, isPlaying]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return {
    generateSpeech,
    playAudio,
    isProcessing,
    clearError,
    isGenerating,
    isPlaying,
    error,
    audioUrl
  };
}