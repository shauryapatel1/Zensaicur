import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MoodLevel } from '../../types';
import { moods } from '../../data/moods';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * MoodSuggestion - Displays AI-detected mood suggestion
 * 
 * @component
 * @param {boolean} showMoodSuggestion - Whether to show the suggestion
 * @param {MoodLevel|null} aiDetectedMood - AI-detected mood level
 * @param {function} onAcceptAiMood - Function to accept AI mood suggestion
 * @param {function} onDismissMoodSuggestion - Function to dismiss AI mood suggestion
 * 
 * @example
 * return (
 *   <MoodSuggestion
 *     showMoodSuggestion={true}
 *     aiDetectedMood={4}
 *     onAcceptAiMood={handleAcceptAiMood}
 *     onDismissMoodSuggestion={handleDismissMoodSuggestion}
 *   />
 * )
 */
interface MoodSuggestionProps {
  showMoodSuggestion: boolean;
  aiDetectedMood: MoodLevel | null;
  onAcceptAiMood: () => void;
  onDismissMoodSuggestion: () => void;
}

const MoodSuggestion = React.memo(function MoodSuggestion({
  showMoodSuggestion,
  aiDetectedMood,
  onAcceptAiMood,
  onDismissMoodSuggestion
}: MoodSuggestionProps) {
  if (!showMoodSuggestion || !aiDetectedMood) return null;

  const suggestedMood = moods.find(m => m.level === aiDetectedMood);
  if (!suggestedMood) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="mb-6 bg-zen-lavender-50 dark:bg-gray-700 border border-zen-lavender-200 dark:border-gray-600 rounded-2xl p-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-zen-lavender-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-zen-sage-800 dark:text-gray-200">
                Based on your writing, I sense you might be feeling{' '}
                <span className="font-semibold">
                  {suggestedMood.label.toLowerCase()}
                </span>
              </p>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                Would you like me to update your mood selection?
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onAcceptAiMood}
              className="px-3 py-1 bg-zen-lavender-500 text-white text-sm rounded-lg hover:bg-zen-lavender-600 transition-colors duration-200"
              aria-label={`Accept suggested mood: ${suggestedMood.label}`}
            >
              Yes
            </button>
            <button
              onClick={onDismissMoodSuggestion}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-zen-sage-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
              aria-label="Keep current mood selection"
            >
              No
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default MoodSuggestion;