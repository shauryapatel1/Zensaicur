import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { withRetry } from '../utils/networkUtils';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage, safeStorage } from '../types/errors';

/**
 * Interface for upsell modal content
 * @interface UpsellModalContent
 */
export interface UpsellModalContent {
  featureName: string;
  featureDescription: string;
}

/**
 * Custom hook for managing premium features and upsell functionality
 * 
 * @returns {Object} Premium state and methods
 * 
 * @example
 * const { 
 *   isPremium, 
 *   showUpsellModal, 
 *   hideUpsellModal,
 *   trackFeatureUsage
 * } = usePremium();
 */
export function usePremium() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState<boolean>(false);
  const [upsellContent, setUpsellContent] = useState<UpsellModalContent>({
    featureName: 'Premium Feature',
    featureDescription: 'Upgrade to Zensai Premium to unlock this feature and many more!'
  });

  // Load user profile data when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserProfile();
    } else {
      setIsLoadingProfile(false);
      setProfile(null);
      setIsTrialActive(false);
    }
  }, [isAuthenticated, user]);

  // Check if user is in trial period whenever profile changes
  useEffect(() => {
    if (profile) {
      // Check if user is within 7 days of account creation
      const createdAt = profile.created_at ? new Date(profile.created_at) : null;
      const now = new Date();
      const trialPeriodDays = 7;
      
      if (createdAt) {
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        setIsTrialActive(daysSinceCreation <= trialPeriodDays);
        console.log(`User created ${daysSinceCreation} days ago, trial active: ${daysSinceCreation <= trialPeriodDays}`);
      }
    }
  }, [profile]);

  /**
   * Load user profile data from Supabase
   */
  const loadUserProfile = async () => {
    if (!user) return;

    console.log('Loading user profile for premium status check');
    try {
      setIsLoadingProfile(true);

      // Check if Supabase client is properly configured
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Validate environment variables
      const env = (import.meta as any).env;
      if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are missing. Please check your .env file.');
      }

      // Test connection first with retry
      await withRetry(async () => {
        const { error: connectionError } = await supabase.auth.getSession();
        if (connectionError && !connectionError.message.includes('Auth session missing')) {
          throw new Error(`Supabase connection failed: ${connectionError.message}`);
        }
        return true;
      });

      // Load profile with retry
      const { data: profileData, error: profileError } = await withRetry(
        async () => {
        return await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        },
        'Load user profile'
      );

      if (profileError) {
        // If profile doesn't exist, that's not necessarily an error for new users
        if (profileError.code === 'PGRST116') {
          console.log('No profile found for user, this is normal for new users');
          setProfile(null);
          return;
        }
        throw new Error(`Profile load failed: ${profileError.message}`);
      }

      setProfile(profileData);
      
      // Check if user is in trial period
      if (profileData) {
        const createdAt = new Date(profileData.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const isInTrial = daysSinceCreation <= 7;
        setIsTrialActive(isInTrial);
        console.log(`User created ${daysSinceCreation} days ago, trial active: ${isInTrial}`);
      }

    } catch (error) {
      const err = error as Error;
      
      // Log detailed error information for debugging
      console.error('Error loading user profile:', {
        message: err.message,
        userId: user.id,
        supabaseUrl: (import.meta as any).env.VITE_SUPABASE_URL,
        hasAnonKey: !!(import.meta as any).env.VITE_SUPABASE_ANON_KEY,
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages
      if (err.message.includes('Request timeout') || err.message.includes('Failed to fetch')) {
        console.error('Network connectivity issue. Please check your internet connection and try again.');
      } else if (err.message.includes('environment variables')) {
        console.error('Configuration error. Please contact support.');
      } else {
        console.error('Unable to load profile data. Please try again later.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  /**
   * Check if user has premium subscription
   */
  const isPremium = profile?.subscription_status === 'premium'; 
  
  /**
   * Check if user has premium plus (yearly) subscription
   */
  const isPremiumPlus = isPremium && profile?.subscription_tier === 'premium_plus';
  
  /**
   * Get subscription expiry date if available
   */
  const subscriptionExpiresAt = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at) 
    : null;

  /**
   * Show upsell modal with custom content
   * 
   * @param {Partial<UpsellModalContent>} content - Custom content for the modal
   */
  const showUpsellModal = useCallback((content: Partial<UpsellModalContent> = {}) => {
    setUpsellContent(prev => ({
      featureName: content.featureName || prev.featureName,
      featureDescription: content.featureDescription || prev.featureDescription
    }));
    setIsUpsellModalOpen(true);
  }, []);

  /**
   * Hide upsell modal
   */
  const hideUpsellModal = useCallback(() => {
    setIsUpsellModalOpen(false);
  }, []);

  /**
   * Check if a feature is available based on subscription status
   * 
   * @param {string} featureName - Name of the feature to check (e.g., 'photo-upload', 'voice-synthesis')
   * @returns {boolean} Whether the feature is available
   */
  const canUseFeature = useCallback((): boolean => {
    // All features are available to premium users and users in trial period
    return isPremium || isTrialActive;
  }, [isPremium, isTrialActive]);

  /**
   * Track feature usage for free users (for daily limits)
   * Premium users and trial users always return true (unlimited usage)
   * 
   * @param {string} featureKey - Key identifying the feature (e.g., 'affirmation-generator', 'mood-analyzer')
   * @returns {boolean} Whether the feature can be used
   */
  const trackFeatureUsage = useCallback((featureKey: string): boolean => {
    // All features are available to premium users and users in trial period
    return isPremium || isTrialActive;
  }, [isPremium, isTrialActive]);

  /**
   * Check if user can access the app (trial active OR premium subscriber)
   */
  const canAccessApp = useCallback((): boolean => {
    return isPremium || isTrialActive;
  }, [isPremium, isTrialActive]);

  /**
   * Check if user needs to subscribe (trial expired and not premium)
   */
  const needsSubscription = useCallback((): boolean => {
    return !isPremium && !isTrialActive;
  }, [isPremium, isTrialActive]);

  /**
   * Get trial status information
   */
  const getTrialStatus = useCallback(() => {
    if (!profile?.created_at) return null;
    const createdAt = new Date(profile.created_at);
    const now = new Date();
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 7 - daysSinceCreation);
    return {
      isActive: isTrialActive,
      daysRemaining,
      trialEndDate: trialEndDate.toISOString(),
      createdAt: createdAt.toISOString()
    };
  }, [profile, isTrialActive]);

  return {
    isPremium,
    isPremiumPlus,
    isTrialActive,
    subscriptionExpiresAt,
    isUpsellModalOpen,
    upsellContent,
    showUpsellModal,
    hideUpsellModal,
    canUseFeature,
    trackFeatureUsage,
    isLoadingProfile,
    canAccessApp,
    needsSubscription,
    getTrialStatus
  };
}