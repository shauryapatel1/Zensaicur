import React from 'react';
import { motion } from 'framer-motion';
import { Crown, CreditCard, ArrowRight, Check } from 'lucide-react';
import { PREMIUM } from '../../constants/uiStrings';
import { stripeProducts } from '../../stripe-config';

/**
 * PlanSelectionButtons - Displays subscription plan options as buttons
 * 
 * @component
 * @param {string} selectedPlan - Currently selected plan (monthly or yearly)
 * @param {function} onSelectPlan - Function to handle plan selection
 * @param {function} onSubscribe - Function to handle subscription
 * @param {boolean} isLoading - Whether subscription is in progress
 * @param {boolean} isSubscribed - Whether user is already subscribed
 * @param {boolean} [disabled=false] - Whether the subscribe button should be disabled
 * 
 * @example
 * return (
 *   <PlanSelectionButtons
 *     selectedPlan="yearly"
 *     onSelectPlan={setSelectedPlan}
 *     onSubscribe={handleSubscribe}
 *     isLoading={isLoading}
 *     isSubscribed={false}
 *   />
 * )
 */
interface PlanSelectionButtonsProps {
  selectedPlan: 'monthly' | 'yearly';
  onSelectPlan: (plan: 'monthly' | 'yearly') => void;
  onSubscribe: () => void;
  isLoading: boolean;
  isSubscribed: boolean;
  disabled?: boolean;
}

const PlanSelectionButtons = React.memo(function PlanSelectionButtons({
  selectedPlan,
  onSelectPlan,
  onSubscribe,
  isLoading,
  isSubscribed,
  disabled = false
}: PlanSelectionButtonsProps) {
  const { MONTHLY, YEARLY, BUTTONS, PLAN_SELECTION, TRIAL_NOTE } = PREMIUM;
  
  // Check if price IDs are configured
  const monthlyProduct = stripeProducts.find(p => p.name === 'Monthly Premium');
  const yearlyProduct = stripeProducts.find(p => p.name === 'Yearly Premium');
  
  const hasValidPrices = !!monthlyProduct?.priceId && !!yearlyProduct?.priceId;
  
  return (
    <motion.div
      className="mb-8 text-center"
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6">
        {PLAN_SELECTION.TITLE}
      </h3>
      
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20 max-w-2xl mx-auto">
        {/* Plan Selection */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <motion.div
            className={`flex-1 p-6 rounded-2xl border-2 transition-all cursor-pointer ${
              selectedPlan === 'monthly'
                ? 'border-zen-mint-400 bg-zen-mint-50 dark:bg-zen-mint-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-zen-mint-300'
            }`}
            onClick={() => onSelectPlan('monthly')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center">
              <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                {MONTHLY.NAME}
              </h4>
              <div className="mb-2">
                <span className="text-3xl font-bold text-zen-sage-800 dark:text-gray-200">{MONTHLY.PRICE}</span>
                <span className="text-zen-sage-600 dark:text-gray-400 ml-1">{MONTHLY.PERIOD}</span>
              </div>
              {selectedPlan === 'monthly' && (
                <div className="inline-flex items-center space-x-1 bg-zen-mint-200 dark:bg-zen-mint-800/50 text-zen-mint-700 dark:text-zen-mint-300 px-3 py-1 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  <span>Selected</span>
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.div
            className={`flex-1 p-6 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
              selectedPlan === 'yearly'
                ? 'border-zen-mint-400 bg-zen-mint-50 dark:bg-zen-mint-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-zen-mint-300'
            }`}
            onClick={() => onSelectPlan('yearly')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Popular tag */}
            <div className="absolute top-[20px] right-[-40px] bg-zen-peach-400 text-white text-xs font-bold px-3 py-1 transform rotate-45 w-36 text-center">
              BEST VALUE
            </div>
            
            <div className="text-center">
              <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                {YEARLY.NAME}
              </h4>
              <div className="mb-2">
                <span className="text-3xl font-bold text-zen-sage-800 dark:text-gray-200">{YEARLY.PRICE}</span>
                <span className="text-zen-sage-600 dark:text-gray-400 ml-1">{YEARLY.PERIOD}</span>
              </div>
              <div className="text-sm text-zen-peach-600 dark:text-zen-peach-400 font-medium mb-2">
                Save 44% compared to monthly
              </div>
              {selectedPlan === 'yearly' && (
                <div className="inline-flex items-center space-x-1 bg-zen-mint-200 dark:bg-zen-mint-800/50 text-zen-mint-700 dark:text-zen-mint-300 px-3 py-1 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  <span>Selected</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        
        {/* Subscribe Button */}
        <motion.button
          onClick={onSubscribe}
          disabled={isLoading || isSubscribed || disabled || !hasValidPrices}
          className="w-full py-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-bold rounded-2xl hover:from-zen-mint-500 hover:to-zen-mint-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3" 
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>{BUTTONS.PROCESSING}</span>
            </>
          ) : isSubscribed ? (
            <>
              <Check className="w-5 h-5" aria-hidden="true" />
              <span>{BUTTONS.CURRENT_PLAN}</span>
            </>
          ) : (
            !hasValidPrices ? (
            <>
              <span>Missing Price Configuration</span>
            </>
            ) : (
            <>
              <Crown className="w-5 h-5" aria-hidden="true" />
              <span>{PLAN_SELECTION.CONTINUE_BUTTON}</span>
              <ArrowRight className="w-5 h-5 ml-1" aria-hidden="true" />
            </>
            )
          )}
        </motion.button>
        
        <p className="text-center text-zen-sage-500 dark:text-gray-400 text-sm mt-4">
          {TRIAL_NOTE}
        </p>
      </div>
    </motion.div>
  );
});

export default PlanSelectionButtons;