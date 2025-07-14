import React from 'react';
import { motion } from 'framer-motion';
import { MoodLevel } from '../types';

interface FoxAvatarProps {
  mood?: MoodLevel;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export default function FoxAvatar({ mood = 3, size = 'md', animate = true }: FoxAvatarProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const getFoxExpression = (mood: MoodLevel) => {
    switch (mood) {
      case 1:
        return { ears: 'rotate-12', eyes: '😔', cheeks: 'opacity-50' };
      case 2:
        return { ears: 'rotate-6', eyes: '😕', cheeks: 'opacity-70' };
      case 3:
        return { ears: 'rotate-0', eyes: '😐', cheeks: 'opacity-80' };
      case 4:
        return { ears: '-rotate-6', eyes: '😊', cheeks: 'opacity-90' };
      case 5:
        return { ears: '-rotate-12', eyes: '🤗', cheeks: 'opacity-100' };
      default:
        return { ears: 'rotate-0', eyes: '😐', cheeks: 'opacity-80' };
    }
  };

  const expression = getFoxExpression(mood);

  return (
    <motion.div
      className={`${sizeClasses[size]} relative flex items-center justify-center`}
      animate={animate ? {
        y: [0, -5, 0],
        rotate: [0, 1, -1, 0],
      } : {}}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Fox Body */}
      <div className="relative">
        {/* Fox Head */}
        <div className="w-20 h-20 bg-gradient-to-br from-zen-peach-300 to-zen-peach-400 rounded-full shadow-lg relative overflow-hidden">
          {/* Fox Ears */}
          <motion.div 
            className={`absolute -top-2 left-2 w-6 h-8 bg-zen-peach-400 rounded-full transform ${expression.ears}`}
            transition={{ duration: 0.5 }}
          />
          <motion.div 
            className={`absolute -top-2 right-2 w-6 h-8 bg-zen-peach-400 rounded-full transform ${expression.ears}`}
            transition={{ duration: 0.5 }}
          />
          
          {/* Inner Ears */}
          <div className="absolute -top-1 left-3 w-3 h-4 bg-zen-peach-500 rounded-full" />
          <div className="absolute -top-1 right-3 w-3 h-4 bg-zen-peach-500 rounded-full" />
          
          {/* Fox Face Markings */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-white rounded-full opacity-80" />
          
          {/* Eyes */}
          <div className="absolute top-7 left-6 text-lg">
            {expression.eyes}
          </div>
          
          {/* Nose */}
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-2 h-1.5 bg-zen-lavender-500 rounded-full" />
          
          {/* Cheeks */}
          <motion.div 
            className={`absolute top-9 left-2 w-4 h-3 bg-zen-peach-500 rounded-full ${expression.cheeks}`}
            transition={{ duration: 0.5 }}
          />
          <motion.div 
            className={`absolute top-9 right-2 w-4 h-3 bg-zen-peach-500 rounded-full ${expression.cheeks}`}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        {/* Sparkles around fox when happy */}
        {mood >= 4 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="absolute -top-2 -left-2 text-zen-mint-400"
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✨
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-3 text-zen-lavender-400"
              animate={{ rotate: -360, scale: [1.2, 1, 1.2] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-3 text-zen-peach-400"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              💫
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}