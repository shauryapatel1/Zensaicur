import React, { useState, useCallback } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { PREMIUM } from '../constants/uiStrings';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import { useLocation, useNavigate } from 'react-router-dom';

// Import memoized components
import SubscriptionPlanCard from './premium/SubscriptionPlanCard';
import PremiumFeaturesSection from './premium/PremiumFeaturesSection';
import FAQSection from './premium/FAQSection';
import CurrentSubscriptionCard from './premium/CurrentSubscriptionCard';
import PlanToggle from './premium/PlanToggle';
import BenefitsSection from './premium/BenefitsSection';
import PlanSelectionButtons from './premium/PlanSelectionButtons';

interface PremiumPageProps {
  onBack: () => void;
}

export default function PremiumPage({ onBack }: PremiumPageProps) {
  const { user } = useAuth();
  const { profile } = useJournal();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [priceIDs, setPriceIDs] = useState({
    monthly: '',
    yearly: ''
  });
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  // Load price IDs from environment variables
  useEffect(() => {
    // Check if this is a redirect from a canceled Stripe checkout
    const query = new URLSearchParams(location.search);
    const subscriptionStatus = query.get('subscription');
    
    if (subscriptionStatus === 'canceled') {
      setError('Your subscription purchase was canceled. You have not been charged.');
      
      // Remove the query parameter from the URL to prevent the message from reappearing
      // on subsequent navigation
      navigate('/premium', { replace: true });
    }
  }, [location, navigate]);

  // Load price IDs from environment variables
  useEffect(() => {
    console.log('VITE_STRIPE_PRICE_ID_MONTHLY:', import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY);
    console.log('VITE_STRIPE_PRICE_ID_YEARLY:', import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY);
    
    setPriceIDs({
      monthly: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || '',
      yearly: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || ''
    });
  }, []);

  /**
   * Handles subscription process by creating a Stripe checkout session
   * @param {string} priceId - The Stripe price ID for the selected plan
   */
  const handleSubscribe = useCallback(async (priceId: string) => {
    if (!user) return;
    
    if (!priceId) {
      setError('Price ID is missing. Please check your environment configuration.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Creating checkout session for price ID:', priceId, 'with user ID:', user.id);
      
      // Call the Supabase Edge Function to create a checkout session
      const { data, error: functionError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          userId: user.id,
          email: user.email,
          name: user.name
        }
      });
      
      if (functionError) {
        console.error('Error creating checkout session:', functionError);
        setError(`Failed to create checkout session: ${functionError.message || 'Unknown error'}`);
        return;
      }
      
      if (!data.success || !data.url) {
        console.error('Checkout session creation failed:', data, data.error);
        setError(data.error || 'Failed to create checkout session. Please try again.');
        return;
      }
      
      console.log('Redirecting to Stripe checkout URL:', data.url);
      
      // Redirect to Stripe Checkout
      // Use a small timeout to ensure console logs are visible
      setTimeout(() => {
        console.log('Executing redirect now...');
        window.location.href = data.url;
      }, 100);
    } catch (err) {
      console.error('Error in subscription process:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(`Subscription error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const isSubscribed = profile?.subscription_status === 'premium';
  const isYearlySubscriber = profile?.subscription_tier === 'premium_plus';
  
  // Determine if we can enable the subscribe button
  const canSubscribe = priceIDs.monthly && priceIDs.yearly;
  
  const expiryDate = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 dark:bg-zen-mint-800 rounded-full opacity-20"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 dark:bg-zen-lavender-800 rounded-full opacity-20"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-zen-peach-200 dark:bg-zen-peach-800 rounded-full opacity-15"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
              aria-label="Go back to previous screen"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <div>
                <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-500" aria-hidden="true" />
                  Zensai Premium
                </h1>
                <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                  Unlock the full potential of your mindfulness journey
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto max-w-6xl px-4 py-8">
        {/* Current Subscription Status */}
        {isSubscribed && (
          <CurrentSubscriptionCard
            isSubscribed={isSubscribed}
            subscriptionTier={profile?.subscription_tier || 'free'}
            expiryDate={expiryDate}
          />
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Benefits Section */}
        <BenefitsSection />
        
        {/* Plan Selection */}
        <PlanSelectionButtons
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          onSubscribe={() => handleSubscribe(
            selectedPlan === 'monthly' 
              ? import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY 
              : import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY
          )}
          isLoading={isLoading}
          isSubscribed={isSubscribed}
        />

        {/* Features Section */}
        <PremiumFeaturesSection />

        {/* FAQ Section */}
        <FAQSection />
      </div>
    </div>
  );
}