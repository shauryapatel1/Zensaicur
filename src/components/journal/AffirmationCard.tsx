import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';
import VoiceButton from '../VoiceButton';

/**
 * AffirmationCard - Displays personalized affirmations with voice playback option
 * 
 * @component
 * @param {string|null} affirmation - Affirmation text to display
 * @param {boolean} isVisible - Whether the card is visible
 * @param {string|null} signedAudioUrl - Signed URL for audio playback
 * @param {boolean} isGeneratingSpeech - Whether speech is being generated
 * @param {boolean} isSpeechPlaying - Whether speech is currently playing
 * @param {function} onPlaySpeech - Function to play affirmation as speech
 * @param {function} onStopSpeech - Function to stop speech playback
 * @param {function} onClose - Function to close the affirmation card
 * @param {boolean} showVoiceButton - Whether to show the voice button
 * @param {boolean} isPremiumUser - Whether user has premium access
 * @param {function} onUpsellTrigger - Function to trigger premium upsell
 */
interface AffirmationCardProps {
  affirmation: string | null;
  isVisible?: boolean;
  signedAudioUrl?: string | null;
  isGeneratingSpeech?: boolean;
  isSpeechPlaying?: boolean;
  isProcessingAudio?: boolean;
  onPlaySpeech?: () => Promise<{ success: boolean }>;
  onStopSpeech?: () => void;
  onClose: () => void;
  showVoiceButton?: boolean;
  isPremiumUser?: boolean;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
  generationProgress?: number;
  error?: string | null;
}

const AffirmationCard = React.memo(function AffirmationCard({
  affirmation,
  isVisible = true,
  signedAudioUrl, 
  isGeneratingSpeech = false,
  isSpeechPlaying = false,
  isProcessingAudio = false,
  onPlaySpeech = () => Promise.resolve({ success: false }),
  onStopSpeech = () => {},
  onClose,
  showVoiceButton = true,
  isPremiumUser = true,
  onUpsellTrigger = () => {},
  generationProgress = 0,
  error = null
}: AffirmationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Set up a timer to auto-close the affirmation card after 60 seconds
  useEffect(() => {
    if (affirmation && isVisible) {
      const timer = setTimeout(() => {
        // Call the onClose function to hide the card
        onClose();
      }, 60000); // 60 seconds
      
      // Clean up the timer when component unmounts or affirmation changes
      return () => clearTimeout(timer);
    }
  }, [affirmation, isVisible, onClose]);

  if (!affirmation || !isVisible) {
    return null;
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-4 max-w-2xl mx-auto">
        {/* Affirmation speech bubble */}
        <motion.div
          className="flex-1 bg-gradient-to-br from-zen-mint-100 to-zen-peach-100 dark:from-gray-700 dark:to-gray-600 backdrop-blur-sm rounded-3xl rounded-tl-lg px-6 py-5 shadow-lg border border-zen-mint-200 dark:border-gray-500 relative"
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Sparkles className="w-5 h-5 text-zen-peach-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-zen-sage-700 dark:text-gray-200 font-medium leading-relaxed">
                  {affirmation}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
              {/* Audio Generation Progress UI */}
              {(isGeneratingSpeech || isProcessingAudio) && (
                <div className="flex flex-col items-center mr-2">
                  <Loader2 className="w-5 h-5 text-zen-mint-600 animate-spin mb-1" />
                  <span className="text-xs text-zen-mint-600">Generating audio...</span>
                  {typeof generationProgress === 'number' && generationProgress > 0 && (
                    <div className="w-16 bg-zen-sage-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                      <motion.div
                        className="bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              )}
              {showVoiceButton && (
                <VoiceButton
                  isGenerating={isGeneratingSpeech}
                  isPlaying={isSpeechPlaying}
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
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-zen-sage-400 hover:text-zen-sage-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-black/20 rounded-full transition-colors"
                aria-label="Close affirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Error Message */}
          {error && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
          {/* Subtle glow effect */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute inset-0 -z-10 bg-gradient-to-r from-zen-mint-200/30 to-zen-peach-200/30 dark:from-zen-mint-900/20 dark:to-zen-peach-900/20 rounded-3xl rounded-tl-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
});

export default AffirmationCard;