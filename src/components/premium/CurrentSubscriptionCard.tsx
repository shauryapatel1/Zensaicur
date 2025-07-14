import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Check } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * CurrentSubscriptionCard - Displays the user's current subscription status
 * 
 * @component
 * @param {boolean} isSubscribed - Whether the user has an active subscription
 * @param {string} subscriptionTier - The user's subscription tier (free, premium, premium_plus)
 * @param {string|null} expiryDate - The date when the subscription expires
 * 
 * @example
 * return (
 *   <CurrentSubscriptionCard 
 *     isSubscribed={true} 
 *     subscriptionTier="premium_plus" 
 *     expiryDate="2023-12-31"
 *   />
 * )
 */
interface CurrentSubscriptionCardProps {
  isSubscribed: boolean;
  subscriptionTier: string;
  expiryDate: string | null;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Unknown';
  }
};

const CurrentSubscriptionCard = React.memo(function CurrentSubscriptionCard({
  isSubscribed,
  subscriptionTier,
  expiryDate
}: CurrentSubscriptionCardProps) {
  if (!isSubscribed) return null;

  const isYearlySubscriber = subscriptionTier === 'premium_plus';
  
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-4">
        {SETTINGS.SUBSCRIPTION.CURRENT_PLAN}
      </h4>
      <div className="bg-gradient-to-r from-zen-mint-100 to-zen-lavender-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-6 shadow-xl border border-zen-mint-200 dark:border-gray-600">
        <div className="flex items-center space-x-4">
          <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-full">
            <Crown className="w-6 h-6 text-yellow-500" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zen-sage-800 dark:text-gray-200">
              {isYearlySubscriber
                ? SETTINGS.SUBSCRIPTION.PREMIUM_YEARLY
                : SETTINGS.SUBSCRIPTION.PREMIUM_MONTHLY}
            </h2>
            <p className="text-zen-sage-600 dark:text-gray-400">
              {isYearlySubscriber 
                ? 'You have a Yearly Premium subscription' 
                : 'You have a Monthly Premium subscription'}
              {expiryDate && ` • Renews on ${formatDate(expiryDate)}`}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default CurrentSubscriptionCard;