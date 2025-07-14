import React from 'react';
import { motion } from 'framer-motion';
import { Crown, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';
import { useNavigate } from 'react-router-dom';
import { useStripe } from '../../hooks/useStripe';

/**
 * SubscriptionSection - Displays the user's current subscription status and management options
 * 
 * @component
 * @param {string} subscriptionStatus - Current subscription status (free, premium, cancelled, expired)
 * @param {string} subscriptionTier - Subscription tier (free, premium, premium_plus)
 * @param {string|null} subscriptionExpiresAt - Date when subscription expires
 * @param {boolean} isTrialActive - Whether the user is in their 7-day trial period
 * @param {string|null} profileCreatedAt - When the user's profile was created
 * 
 * @example
 * return (
 *   <SubscriptionSection
 *     subscriptionStatus="premium"
 *     subscriptionTier="premium_plus"
 *     subscriptionExpiresAt="2023-12-31T00:00:00Z"
 *     isTrialActive={false}
 *     profileCreatedAt="2023-01-01T00:00:00Z"
 *   />
 * )
 */
interface SubscriptionSectionProps {
  subscriptionStatus: string;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  isTrialActive: boolean;
  profileCreatedAt: string | null;
}

const SubscriptionSection = React.memo(function SubscriptionSection({
  subscriptionStatus,
  subscriptionTier,
  subscriptionExpiresAt,
  isTrialActive,
  profileCreatedAt
}: SubscriptionSectionProps) {
  const navigate = useNavigate();
  const { redirectToCustomerPortal, isLoading, error: stripeError } = useStripe();
  
  const isPremium = subscriptionStatus === 'premium';
  const isYearlySubscriber = subscriptionTier === 'premium_plus';
  const isCancelled = subscriptionStatus === 'cancelled';
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate trial end date if user is in trial period
  const getTrialEndDate = () => {
    if (!profileCreatedAt) return null;
    
    const createdDate = new Date(profileCreatedAt);
    const trialEndDate = new Date(createdDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
    
    return formatDate(trialEndDate.toISOString());
  };

  const handleManageSubscription = async () => {
    if (isPremium && !isLoading) {
      const portalUrl = await redirectToCustomerPortal();
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    } else {
      // Navigate to premium page
      navigate('/premium');
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
      <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
        <Crown className="w-5 h-5 mr-2 text-yellow-500" aria-hidden="true" /> 
        {SETTINGS.SUBSCRIPTION.TITLE}
        {isTrialActive && !isPremium && <span className="ml-2 text-xs bg-zen-mint-100 dark:bg-zen-mint-900/30 text-zen-mint-700 dark:text-zen-mint-400 px-2 py-0.5 rounded-full">Trial Active</span>}
      </h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-zen-mint-50 to-zen-lavender-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
          <div className="flex items-center justify-between mb-2"> 
            <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">{SETTINGS.SUBSCRIPTION.CURRENT_PLAN}</h4>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPremium 
                ? 'bg-zen-mint-100 text-zen-mint-700 dark:bg-zen-mint-900/30 dark:text-zen-mint-400'
                : 'bg-zen-sage-100 text-zen-sage-700 dark:bg-gray-600 dark:text-gray-300'
            }`}>
              {isPremium 
                ? isYearlySubscriber 
                  ? SETTINGS.SUBSCRIPTION.PREMIUM_YEARLY
                  : SETTINGS.SUBSCRIPTION.PREMIUM_MONTHLY
                : SETTINGS.SUBSCRIPTION.FREE}
            </span>
          </div>
          
          {/* Trial Period Info */}
          {isTrialActive && !isPremium && (
            <div className="flex items-center space-x-2 text-sm text-zen-mint-600 dark:text-zen-mint-400 mb-4">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Free trial ends on {getTrialEndDate()}</span>
            </div>
          )}
          
          {/* Subscription Renewal Info */}
          {isPremium && subscriptionExpiresAt && (
            <div className="flex items-center space-x-2 text-sm text-zen-sage-600 dark:text-gray-400 mb-4">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>
                {isCancelled 
                  ? SETTINGS.SUBSCRIPTION.CANCELLED.replace('{date}', formatDate(subscriptionExpiresAt))
                  : SETTINGS.SUBSCRIPTION.RENEWAL.replace('{date}', formatDate(subscriptionExpiresAt))}
              </span>
            </div>
          )}
          
          {/* Error Message */}
          {stripeError && (
            <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{stripeError}</span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Subscribe/Manage Button */}
            <button
              onClick={() => navigate('/premium')}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crown className="w-4 h-4" aria-hidden="true" />
              <span>
                {isLoading 
                  ? 'Loading...' 
                  : isPremium 
                    ? 'Manage Subscription' 
                    : 'Subscribe to Premium'
                }
              </span>
              {!isLoading && <ExternalLink className="w-4 h-4" aria-hidden="true" />}
            </button>
            
            {/* Cancel Subscription Button - Only show for active premium subscribers */}
            {isPremium && !isCancelled && (
              <button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Cancel Subscription</span>
              </button>
            )}
          </div>
          
          {/* Subscription Benefits */}
          {!isPremium && (
            <div className="mt-4 pt-4 border-t border-zen-sage-200 dark:border-gray-600">
              <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                Subscribe to continue using all features after your trial ends.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SubscriptionSection;