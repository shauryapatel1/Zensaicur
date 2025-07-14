import React from 'react';
import { motion } from 'framer-motion';
import { Check, CreditCard } from 'lucide-react';
import { PREMIUM } from '../../constants/uiStrings';

/**
 * SubscriptionPlanCard - Displays a subscription plan with details and action button
 * 
 * @component
 * @param {string} id - Plan identifier
 * @param {string} name - Plan name
 * @param {string} price - Plan price
 * @param {string} period - Billing period (e.g., "per month")
 * @param {string[]} features - List of plan features
 * @param {boolean} popular - Whether this is the popular/recommended plan
 * @param {boolean} isSubscribed - Whether user is currently subscribed to this plan
 * @param {boolean} isLoading - Whether subscription action is in progress
 * @param {function} onSubscribe - Function to call when subscribing
 * @param {number} [delay] - Animation delay
 * 
 * @example
 * return (
 *   <SubscriptionPlanCard
 *     id="monthly"
 *     name="Monthly Premium"
 *     price="$8.99"
 *     period="per month"
 *     features={['Feature 1', 'Feature 2']}
 *     popular={false}
 *     isSubscribed={false}
 *     isLoading={false}
 *     onSubscribe={handleSubscribe}
 *   />
 * )
 */
interface PlanFeature {
  text: string;
}

interface SubscriptionPlanProps {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  delay?: number;
}

const SubscriptionPlanCard = React.memo(function SubscriptionPlanCard({
  id,
  name,
  price,
  period,
  features,
  popular,
  isSubscribed,
  isLoading,
  onSubscribe,
  delay = 0
}: SubscriptionPlanProps) {
  return (
    <motion.div
      className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border ${
        popular
          ? 'border-zen-mint-300 dark:border-zen-mint-700'
          : 'border-white/20 dark:border-gray-600/20'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
    >
      {popular && (
        <div className="bg-gradient-to-r from-zen-mint-500 to-zen-mint-600 text-white text-center py-2 font-medium text-sm">
          Most Popular • Save 44%
        </div>
      )}
      
      <div className="p-6">
        <h3 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
          {name}
        </h3>
        
        <div className="mb-4">
          <span className="text-3xl font-bold text-zen-sage-800 dark:text-gray-200">{price}</span>
          <span className="text-zen-sage-600 dark:text-gray-400 ml-1">{period}</span>
        </div>
        
        <div className="text-zen-sage-600 dark:text-gray-400 text-sm mb-4">
          7-day free trial, cancel anytime
        </div>
        
        <button
          onClick={onSubscribe}
          disabled={isLoading || isSubscribed}
          className={`w-full py-3 rounded-xl font-medium mb-6 flex items-center justify-center space-x-2 ${
            popular
              ? 'bg-gradient-to-r from-zen-mint-500 to-zen-mint-600 text-white hover:from-zen-mint-600 hover:to-zen-mint-700'
              : 'bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 hover:bg-zen-sage-200 dark:hover:bg-gray-600'
          } transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={`Subscribe to ${name}`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>{PREMIUM.BUTTONS.PROCESSING}</span>
            </>
          ) : isSubscribed ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{PREMIUM.BUTTONS.CURRENT_PLAN}</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span>{PREMIUM.BUTTONS.SUBSCRIBE}</span>
            </>
          )}
        </button>
        
        <ul className="space-y-3" aria-label={`Features of ${name}`}>
          {features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-zen-mint-500 mt-1 flex-shrink-0" aria-hidden="true" />
              <span className="text-zen-sage-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
});

export default SubscriptionPlanCard;