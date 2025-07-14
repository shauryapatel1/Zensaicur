import React from 'react';
import Lottie from 'lottie-react';
import { motion } from 'framer-motion';
import { MoodLevel } from '../types';
import { APP_NAME } from '../constants/uiStrings';

// Import all Lottie animation files
import zenoHiAnimation from '../assets/Zeno saying Hi!!.json';
import zenoJournalingAnimation from '../assets/Zeno - Journaling.json';
import zenoTypingAnimation from '../assets/Zeno typing on Laptop.json';
import zenoCodingAnimation from '../assets/Zeno coding and drnking coffee.json';
import zenoMusicAnimation from '../assets/Zeno listening Music (headphones On).json';

/**
 * LottieAvatar - Animated fox avatar with different moods and variants
 * 
 * @component
 * @param {MoodLevel} [mood=3] - Mood level affecting animation style
 * @param {'sm'|'md'|'lg'} [size='md'] - Size of the avatar
 * @param {'idle'|'greeting'|'journaling'|'typing'|'coding'|'music'} [variant='idle'] - Animation variant
 * @param {boolean} [animate=true] - Whether to animate the avatar
 * @param {string} [aria-label] - Accessibility label
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return (
 *   <LottieAvatar
 *     mood={4}
 *     size="lg"
 *     variant="greeting"
 *     animate={true}
 *   />
 * )
 */
interface LottieAvatarProps {
  mood?: MoodLevel;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'idle' | 'greeting' | 'journaling' | 'typing' | 'coding' | 'music';
  animate?: boolean;
  'aria-label'?: string;
  className?: string;
}

const LottieAvatar = React.memo(function LottieAvatar({ 
  mood = 3, 
  size = 'md', 
  variant = 'idle',
  animate = true,
  className = '',
  'aria-label': ariaLabel
}: LottieAvatarProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  // Map variant to animation file
  const variantToAnimation = {
    greeting: zenoHiAnimation,
    journaling: zenoJournalingAnimation,
    typing: zenoTypingAnimation,
    coding: zenoCodingAnimation,
    music: zenoMusicAnimation
  };

  // Helper to get the right animation based on mood and variant
  const getAnimation = (mood: MoodLevel, variant: string) => {
    if (variant === 'idle') {
      // Use different animations based on mood for idle state
      if (mood >= 4) return zenoHiAnimation; // Happy Zeno for good/amazing moods
      if (mood <= 2) return zenoJournalingAnimation; // Contemplative Zeno for struggling/low moods
      return zenoTypingAnimation; // Neutral Zeno for neutral mood
    }
    
    return variantToAnimation[variant as keyof typeof variantToAnimation] || zenoHiAnimation;
  };

  // Get animation based on current mood and variant
  const animationData = getAnimation(mood, variant);
  const animationKey = `${variant}-${mood}`;

  // Get container styling based on mood
  const getMoodStyling = () => {
    switch (mood) {
      case 1:
        return 'drop-shadow-lg filter hue-rotate-180';
      case 2:
        return 'drop-shadow-md filter saturate-75';
      case 3:
        return 'drop-shadow-md';
      case 4:
        return 'drop-shadow-lg filter brightness-110';
      case 5:
        return 'drop-shadow-xl filter brightness-125 saturate-125';
      default:
        return 'drop-shadow-md';
    }
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} relative flex items-center justify-center ${getMoodStyling()} ${className}`}
      role="img"
      aria-label={ariaLabel || `Zeno the fox companion for ${APP_NAME} in ${variant} mode, feeling ${mood >= 4 ? 'happy' : mood <= 2 ? 'contemplative' : 'neutral'}`}
      aria-live={variant === 'greeting' ? 'polite' : 'off'}
      animate={animate ? {
        y: [0, -5, 0],
        scale: [1, 1.03, 1],
      } : {}}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div 
        className="relative w-full h-full"
        key={animationKey}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="w-full h-full"
          aria-hidden="true"
          style={{
            filter: mood >= 4 ? 'brightness(1.1) saturate(1.2)' : 
                   mood <= 2 ? 'brightness(0.9) saturate(0.8)' : 'none'
          }}
        />
        
        {/* Sparkles around Zeno when happy */}
        {mood >= 4 && (
          <motion.div
            className="absolute inset-0 pointer-events-none" 
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="absolute -top-2 -left-2 text-zen-mint-400 text-lg"
              animate={{ 
                rotate: 360, 
                scale: [1, 1.3, 1],
                x: [0, 5, 0],
                y: [0, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ✨
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-3 text-zen-lavender-400 text-sm"
              animate={{ 
                rotate: -360, 
                scale: [1.2, 1, 1.2],
                x: [0, -3, 0],
                y: [0, 3, 0]
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-3 text-zen-peach-400 text-base"
              animate={{ 
                rotate: 360, 
                scale: [1, 1.4, 1],
                x: [0, 8, 0],
                y: [0, -8, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              💫
            </motion.div>
            <motion.div
              className="absolute top-1/2 -right-4 text-zen-mint-300 text-xs"
              animate={{ 
                rotate: -180, 
                scale: [1, 1.2, 1],
                x: [0, -5, 0]
              }}
              transition={{ duration: 3.5, repeat: Infinity }}
            >
              🌟
            </motion.div>
          </motion.div>
        )}

        {/* Gentle glow effect for very happy moods */}
        {mood === 5 && (
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-zen-mint-200/30 via-transparent to-transparent rounded-full" 
            aria-hidden="true"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
});

export default LottieAvatar;