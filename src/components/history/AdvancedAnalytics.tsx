import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Crown } from 'lucide-react';
import { HISTORY } from '../../constants/uiStrings';

/**
 * AdvancedAnalytics - Component that displays advanced analytics features or upsell for premium
 * 
 * @component
 * @param {boolean} isPremium - Whether the user has premium subscription
 * @param {function} onUpgrade - Function to call when user clicks upgrade button
 * 
 * @example
 * return (
 *   <AdvancedAnalytics
 *     isPremium={false}
 *     onUpgrade={handleShowUpsellModal}
 *   />
 * )
 */
interface AdvancedAnalyticsProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

const AdvancedAnalytics = React.memo(function AdvancedAnalytics({
  isPremium,
  onUpgrade
}: AdvancedAnalyticsProps) {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
        <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-zen-mint-500" aria-hidden="true" /> 
          <span>{HISTORY.ANALYTICS.TITLE}</span>
          {!isPremium && (
            <span className="text-xs font-normal text-zen-peach-500 bg-zen-peach-100 dark:bg-zen-peach-900/30 px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </h2>
        
        {isPremium ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-zen-mint-400 mx-auto mb-4 opacity-70" aria-hidden="true" /> 
            <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
              {HISTORY.ANALYTICS.COMING_SOON}
            </h3>
            <p className="text-zen-sage-600 dark:text-gray-400 max-w-md mx-auto">
              {HISTORY.ANALYTICS.COMING_SOON_DESC}
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-zen-mint-50 to-zen-lavender-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-full flex-shrink-0">
                <Crown className="w-6 h-6 text-yellow-500" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Your Free Trial Has Ended
                </h3>
                <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                  Subscribe to Zensai Premium to continue accessing your advanced analytics, unlimited journal history, and all other premium features.
                </p>
                <button
                  onClick={onUpgrade}
                  className="px-4 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md"
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default AdvancedAnalytics;