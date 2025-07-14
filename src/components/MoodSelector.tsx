import React from 'react';
import { motion } from 'framer-motion';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';
import { JOURNAL } from '../constants/uiStrings';

/**
 * MoodSelector - Component for selecting mood from a range of options
 * 
 * @component
 * @param {MoodLevel} [selectedMood] - Currently selected mood
 * @param {function} onMoodSelect - Function to handle mood selection
 * @param {'sm'|'md'|'lg'} [size='md'] - Size of the mood selector
 * @param {'horizontal'|'grid'} [layout='horizontal'] - Layout of mood options
 * @param {boolean} [showLabels=true] - Whether to show mood labels
 * @param {boolean} [disabled=false] - Whether the selector is disabled
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return (
 *   <MoodSelector
 *     selectedMood={mood}
 *     onMoodSelect={setMood}
 *     size="md"
 *     layout="horizontal"
 *     showLabels={true}
 *   />
 * )
 */
interface MoodSelectorProps {
  selectedMood?: MoodLevel;
  onMoodSelect: (mood: MoodLevel) => void;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'grid';
  showLabels?: boolean;
  disabled?: boolean;
  className?: string;
}

const MoodSelector = React.memo(function MoodSelector({ 
  selectedMood, 
  onMoodSelect, 
  size = 'md',
  layout = 'horizontal',
  showLabels = true,
  disabled = false,
  className = ''
}: MoodSelectorProps) {
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, mood: MoodLevel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onMoodSelect(mood);
      }
    }
  };
  
  const sizeClasses = {
    sm: {
      container: 'p-2',
      emoji: 'text-lg',
      label: 'text-xs',
      button: 'p-2'
    },
    md: {
      container: 'p-3',
      emoji: 'text-2xl',
      label: 'text-xs',
      button: 'p-3'
    },
    lg: {
      container: 'p-4',
      emoji: 'text-3xl',
      label: 'text-sm',
      button: 'p-4'
    }
  };

  const layoutClasses = {
    horizontal: 'flex justify-between items-center space-x-2 overflow-x-auto scrollbar-hide',
    grid: 'grid grid-cols-3 sm:grid-cols-5 gap-3'
  };

  const currentSizeClasses = sizeClasses[size];

  return (
    <div className={`${className}`} role="radiogroup" aria-label="Mood selection">
      <div className={`${layoutClasses[layout]} ${layout === 'horizontal' ? 'pb-2' : ''}`} aria-orientation={layout === 'horizontal' ? 'horizontal' : 'vertical'}>
        {moods.map((mood, index) => {
          const isSelected = selectedMood === mood.level;
          
          return (
            <motion.button
              key={mood.level}
              onClick={() => !disabled && onMoodSelect(mood.level)}
              onKeyDown={(e) => handleKeyDown(e, mood.level)}
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : isSelected ? 0 : -1}
              className={`
                relative flex flex-col items-center justify-center rounded-2xl transition-all duration-300 
                ${currentSizeClasses.container} ${currentSizeClasses.button}
                ${layout === 'horizontal' ? 'flex-shrink-0 min-w-0' : 'aspect-square'}
                ${isSelected
                  ? 'bg-gradient-to-br from-zen-mint-200 to-zen-mint-300 shadow-lg scale-105 ring-2 ring-zen-mint-400 ring-opacity-50'
                  : 'bg-white/70 hover:bg-white/90 hover:scale-105 shadow-md hover:shadow-lg'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                backdrop-blur-sm border border-white/30
              `}
              whileHover={!disabled ? { y: -2 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
            >
              {/* Mood Emoji */}
              <motion.div 
                className={`${currentSizeClasses.emoji} mb-1 select-none`}
                aria-hidden="true"
                animate={isSelected ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 0.5 }}
              >
                {mood.emoji}
              </motion.div>
              
              {/* Mood Label */}
              {showLabels && (
                <div className={`${currentSizeClasses.label} font-medium text-zen-sage-600 text-center leading-tight select-none`}>
                  <span>{mood.label}</span>
                </div>
              )}
              
              {/* Selection Indicator */}
              {isSelected && (
                <>
                  <motion.div
                    layoutId="mood-indicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-zen-mint-500 rounded-full"
                    aria-hidden="true"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-zen-mint-200/30 rounded-2xl"
                    aria-hidden="true"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Sparkle Effects for Happy Moods */}
                  {mood.level >= 4 && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      aria-hidden="true"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        className="absolute -top-1 -right-1 text-zen-mint-400 text-xs"
                        animate={{ 
                          rotate: 360, 
                          scale: [1, 1.3, 1],
                          
                        }}
                        aria-hidden="true"
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        ✨
                      </motion.div>
                      {mood.level === 5 && (
                        <motion.div
                          className="absolute -bottom-1 -left-1 text-zen-peach-400 text-xs"
                          animate={{ 
                            rotate: -360, 
                            scale: [1.2, 1, 1.2],
                            
                          }}
                          aria-hidden="true"
                          transition={{ duration: 2.5, repeat: Infinity }}
                        >
                          💫
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </>
              )}
              
              {/* Hover Glow Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-zen-mint-100/0 to-zen-peach-100/0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
                whileHover={!disabled ? {
                  background: [
                    "linear-gradient(135deg, rgba(153, 249, 234, 0) 0%, rgba(251, 146, 60, 0) 100%)",
                    "linear-gradient(135deg, rgba(153, 249, 234, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)",
                    "linear-gradient(135deg, rgba(153, 249, 234, 0) 0%, rgba(251, 146, 60, 0) 100%)"
                  ]
                } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.button>
          );
        })}
      </div>
      
      {/* Mobile Scroll Indicator */}
      {layout === 'horizontal' && (
        <div className="flex justify-center mt-2 sm:hidden" aria-hidden="true">
          <div className="flex space-x-1">
            {moods.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 bg-zen-sage-300 rounded-full opacity-50"
              />
            ))}
          </div>
          <p className="text-xs text-zen-sage-500 ml-2">Swipe to see all moods</p>
        </div>
      )}
    </div>
  );
});

export default MoodSelector;