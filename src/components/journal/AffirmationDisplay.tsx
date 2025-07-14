import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import VoiceButton from '../VoiceButton';

/**
 * AffirmationDisplay - Displays personalized affirmations with voice playback option
 * 
 * @component
 * @param {string|null} affirmation - Affirmation text to display
 * @param {string|null} affirmationError - Error message if affirmation generation failed
 * @param {boolean} isGeneratingSpeech - Whether speech is being generated
 * @param {boolean} isSpeechPlaying - Whether speech is currently playing
 * @param {function} onPlaySpeech - Function to play affirmation as speech
 * @param {function} onStopSpeech - Function to stop speech playback
 */
interface AffirmationDisplayProps {
  affirmation: string | null;
  affirmationError?: string | null;
  signedAudioUrl?: string | null; 
  isGeneratingSpeech: boolean;
  isSpeechPlaying: boolean;
  isProcessingAudio?: boolean;
  isProcessingAudio?: boolean;
  onPlaySpeech: () => void;
  onStopSpeech: () => void;
  isPremiumUser?: boolean;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
}

const AffirmationDisplay = React.memo(function AffirmationDisplay({
  affirmation,
  signedAudioUrl, 
  isGeneratingSpeech,
  isSpeechPlaying,
  isProcessingAudio = false,
  isProcessingAudio = false,
  onPlaySpeech,
  onStopSpeech,
  isPremiumUser = true,
  onUpsellTrigger = () => {}
}: AffirmationDisplayProps) {
  if (!affirmation) return null;
  return (
    <div className="flex items-start space-x-3 mb-6 bg-gradient-to-br from-zen-mint-100 to-zen-peach-100 dark:from-gray-700 dark:to-gray-600 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-zen-mint-200 dark:border-gray-500">
      <Sparkles className="w-5 h-5 text-zen-peach-500 mt-1 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-zen-sage-700 dark:text-gray-200 font-medium leading-relaxed">
          {affirmation}
        </p>
        {affirmationError && (
          <p className="text-zen-sage-500 dark:text-gray-400 text-sm mt-2 italic">
            {affirmationError}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <VoiceButton
          isGenerating={isGeneratingSpeech}
          isPlaying={isSpeechPlaying}
          isProcessing={isProcessingAudio}
          isProcessing={isProcessingAudio}
          onPlay={onPlaySpeech}
          onStop={onStopSpeech}
          size="sm"
          isPremiumUser={isPremiumUser}
          onUpsellTrigger={() => onUpsellTrigger(
            'Voice Affirmations', 
            'Listen to your personalized affirmations with natural-sounding voice'
          )}
        />
      </div>
    </div>
  );
});

export default AffirmationDisplay;