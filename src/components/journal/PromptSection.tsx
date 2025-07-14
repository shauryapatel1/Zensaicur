import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, RefreshCw, Loader2, Crown } from 'lucide-react';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * PromptSection - Displays daily journaling prompts with voice playback option
 * 
 * @component
 * @param {string} dailyPrompt - Prompt text to display
 * @param {boolean} isLoadingPrompt - Whether a new prompt is being loaded
 * @param {function} onGenerateNewPrompt - Function to generate a new prompt
 * 
 * @example
 * return (
 *   <PromptSection
 *     dailyPrompt="What are you grateful for today?"
 *     isLoadingPrompt={false}
 *     onGenerateNewPrompt={handleGenerateNewPrompt}
 *   />
 * )
 */
interface PromptSectionProps {
  dailyPrompt: string;
  isLoadingPrompt: boolean;
  onGenerateNewPrompt: () => void;
  isPremiumUser?: boolean;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
}

const PromptSection = React.memo(function PromptSection({
  dailyPrompt,
  isLoadingPrompt,
  onGenerateNewPrompt,
  isPremiumUser = true,
  onUpsellTrigger = () => {}
}: PromptSectionProps) {
  // Determine if refresh should trigger premium upsell
  const handleRefreshClick = () => {
    // If user is not premium, show upsell
    if (!isPremiumUser) {
      onUpsellTrigger('Premium Features', 'Get unlimited access to all features including personalized reflection prompts');
    } else {
      // Pass true to force a refresh even if we already have a prompt
      onGenerateNewPrompt(true);
    }
  };

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 dark:border-gray-600/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-zen-peach-500" aria-hidden="true" />
            <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200" id="daily-prompt-heading">
              Today's Reflection
            </h3>
          </div>
          
          {/* Refresh Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshClick}
              disabled={isLoadingPrompt}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-full transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-label="Generate new prompt"
            >
              {isLoadingPrompt || !dailyPrompt ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" key="loading-spinner" />
              ) : (
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <div 
          className="min-h-[3rem] text-zen-sage-700 dark:text-gray-300 leading-relaxed"
          aria-labelledby="daily-prompt-heading"
          aria-live={isLoadingPrompt ? "polite" : "off"}
        >
          {isLoadingPrompt || !dailyPrompt ? (
            <div className="flex items-center space-x-2 text-zen-sage-500 dark:text-gray-400 italic">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Generating new reflection question...</span>
            </div>
          ) : (
            <p>{dailyPrompt}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default PromptSection;