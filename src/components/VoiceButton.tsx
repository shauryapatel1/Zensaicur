import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

/**
 * VoiceButton - Button for playing text as speech
 * 
 * @component
 * @param {boolean} isGenerating - Whether speech is being generated
 * @param {boolean} isPlaying - Whether speech is currently playing
 * @param {function} onPlay - Function to play speech
 * @param {function} onStop - Function to stop speech
 * @param {boolean} [disabled=false] - Whether the button is disabled
 * @param {'sm'|'md'|'lg'} [size='md'] - Size of the button
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return (
 *   <VoiceButton
 *     isGenerating={isGeneratingSpeech}
 *     isPlaying={isSpeechPlaying}
 *     onPlay={handlePlaySpeech}
 *     onStop={handleStopSpeech}
 *     size="md"
 *   />
 * )
 */
interface VoiceButtonProps {
  isGenerating: boolean;
  isPlaying: boolean;
  isProcessing?: boolean;
  onPlay: () => Promise<{success: boolean}> | void;
  onStop: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
  isPremiumUser?: boolean;
}

const VoiceButton = React.memo(function VoiceButton({
  isGenerating,
  isPlaying,
  isProcessing = false,
  onPlay,
  onStop,
  disabled = false,
  size = 'md',
  className = '',
  onUpsellTrigger = () => {},
  isPremiumUser = true
}: VoiceButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = () => {
    if (disabled || isGenerating || isProcessing) {
      return;
    }
    
    if (!isPremiumUser) {
      onUpsellTrigger('Voice Synthesis', 'Listen to your affirmations and prompts with AI-powered voice synthesis');
      return;
    }
    
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  };

  const getIcon = () => {
    if (isGenerating || (isProcessing && !isPlaying)) {
      return <Loader2 className={`${iconSizes[size]} animate-spin`} />;
    }
    if (isPlaying) {
      return <VolumeX className={iconSizes[size]} />;
    }
    return <Volume2 className={iconSizes[size]} />;
  };

  const getTooltip = () => {
    if (!isPremiumUser) return 'Premium feature - Upgrade to unlock';
    if (isGenerating) return 'Generating audio...';
    if (isProcessing && !isGenerating && !isPlaying) return 'Processing audio...';
    if (isPlaying) return 'Stop audio playback';
    return 'Listen to affirmation';
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isGenerating || isProcessing}
      className={`
        ${sizeClasses[size]}
        bg-zen-peach-400 hover:bg-zen-peach-500
        text-white rounded-full 
        transition-all duration-300 
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${className}
      `}
      whileHover={!disabled && !isGenerating && !isProcessing ? { scale: 1.1 } : {}}
      whileTap={!disabled && !isGenerating && !isProcessing ? { scale: 0.95 } : {}}
      title={getTooltip()}
      aria-label={isPlaying ? 'Stop speech' : isGenerating ? 'Generating speech...' : isProcessing ? 'Processing audio...' : 'Play speech'}
      aria-disabled={disabled || isGenerating || isProcessing}
      aria-pressed={isPlaying}
    >
      {getIcon()}
      
      {/* Pulse effect when playing */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 bg-zen-peach-400 rounded-full"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Processing pulse effect */}
      {isProcessing && !isPlaying && !isGenerating && (
        <motion.div
          className="absolute inset-0 bg-zen-peach-400 rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
});

export default VoiceButton;