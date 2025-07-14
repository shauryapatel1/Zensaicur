import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Heart, Sparkles, AlertCircle, CheckCircle, Trophy, Target, BarChart3, BookOpen, Lightbulb, RefreshCw, Save, Volume2, Settings, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { usePremium } from '../hooks/usePremium'; 
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import LottieAvatar from './LottieAvatar';
import { useLocation, useNavigate } from 'react-router-dom'; 
import { useStripe } from '../hooks/useStripe';
import BadgeWidget from './BadgeWidget';
import UpsellModal from './UpsellModal';
import ToastNotification, { ToastType } from './ToastNotification';
import HomeScreen from './HomeScreen';
import MoodHistoryScreen from './MoodHistoryScreen';
import SettingsScreen from './SettingsScreen';
import BadgesScreen from './BadgesScreen';
import PremiumPage from './PremiumPage'; 
import WelcomeSection from './journal/WelcomeSection';

// Define available Lottie animation variants
const LOTTIE_VARIANTS = ['greeting', 'journaling', 'typing'];

type MoodLevel = 1 | 2 | 3 | 4 | 5;
type CurrentView = 'journal' | 'history' | 'settings' | 'badges' | 'premium';

export default function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isSupabaseConnected = !!supabase;
  const {
    entries,
    getTotalEntries, 
    getStreak,
    getBestStreak,
    hasEntryToday,
    isLoading: journalLoading,
    error: journalError,
    badges,
    profile
  } = useJournal();
  const { handleSubscriptionSuccess } = useStripe();
  
  const { isPremium, isTrialActive, canAccessApp, needsSubscription, getTrialStatus, isUpsellModalOpen, hideUpsellModal, upsellContent, showUpsellModal } = usePremium();
  const [randomZenoVariant, setRandomZenoVariant] = useState<'greeting' | 'journaling' | 'typing' | undefined>('greeting');
  const [currentView, setCurrentView] = useState<CurrentView>('journal');

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [toastBadge, setToastBadge] = useState<{ icon: string; name: string; rarity: string } | undefined>();

  // Track previous badges to detect new ones
  const [previousBadges, setPreviousBadges] = useState<string[]>([]);

  // Check for subscription activation success message
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const subscriptionActivated = query.get('subscription_activated');
    
    if (subscriptionActivated === 'true') {
      showToast(
        'Your premium subscription has been activated! Enjoy all the premium features.',
        'success'
      );
      // Remove the query parameter
      navigate('/home', { replace: true });
    }
  }, [location, navigate]);

  // Redirect to premium page if trial expired and not premium
  useEffect(() => {
    if (needsSubscription()) {
      navigate('/premium', { replace: true });
    }
  }, [needsSubscription, navigate]);

  // Show trial expiration warning if <=2 days left
  const trialStatus = getTrialStatus();
  const showTrialWarning = isTrialActive && (trialStatus?.daysRemaining ?? 0) <= 2;

  const showToast = (message: string, type: ToastType = 'success', badge?: { icon: string; name: string; rarity: string }) => {
    setToastMessage(message);
    setToastType(type);
    setToastBadge(badge);
    setToastVisible(true);
  };

  // Helper function to get contextual message based on recent activity
  const getContextualMessage = () => {
    if (entries.length === 0) return '';
    
    try {
      const recentEntry = entries[0];
      const recentMoodLevel = getMoodLevel(recentEntry.mood);
      const daysSinceLastEntry = Math.floor((Date.now() - new Date(recentEntry.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
      if (daysSinceLastEntry === 0) {
        // Same day
        const messages: Record<MoodLevel, string> = {
          1: 'I see you\'re going through a tough time. Remember, I\'m here with you every step of the way.',
          2: 'You\'ve been feeling low lately. Your courage to keep journaling shows your inner strength.',
          3: 'You\'re finding your balance. Each reflection brings you closer to understanding yourself.',
          4: 'Your positive energy has been shining through your recent entries. Keep nurturing that light!',
          5: 'What a joy it is to see you flourishing! Your happiness radiates through your words.'
        };
        return messages[recentMoodLevel] || 'Thank you for sharing your thoughts with me.';
      } else if (daysSinceLastEntry === 1) {
        return 'Welcome back! I\'ve been thinking about our last conversation.';
      } else if (daysSinceLastEntry <= 7) {
        return `It\'s been ${daysSinceLastEntry} days since we last talked. I\'m glad you\'re here.`;
      } else {
        return 'It\'s wonderful to have you back. I\'ve missed our conversations.';
      }
    } catch (err) {
      console.error('Error generating contextual message:', err);
      return '';
    }
  };

  const getMoodLevel = (moodString: string): MoodLevel => {
    const moodMap: Record<string, MoodLevel> = {
      'struggling': 1,
      'low': 2, 
      'neutral': 3, 
      'good': 4, 
      'amazing': 5
    };
    return moodMap[moodString] || 3;
  };

  // Set a random Zeno variant on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOTTIE_VARIANTS.length);
    setRandomZenoVariant(LOTTIE_VARIANTS[randomIndex] || 'greeting');
  }, []);

  // Initialize previous badges on first load
  useEffect(() => {
    if (badges.length > 0 && previousBadges.length === 0) {
      const earnedBadgeIds = badges.filter(b => b.earned).map(b => b.id);
      setPreviousBadges(earnedBadgeIds);
      console.log('Initialized previous badges:', earnedBadgeIds);
    }
  }, [badges, previousBadges.length]);

  // Check for new badges and show notifications
  useEffect(() => {
    if (badges.length > 0 && previousBadges.length > 0) {
      const currentEarnedBadges = badges.filter(b => b.earned).map(b => b.id);
      console.log('Current earned badges:', currentEarnedBadges);
      console.log('Previous badges:', previousBadges);
      
      const newBadges = currentEarnedBadges.filter(id => !previousBadges.includes(id));
      console.log('New badges:', newBadges);
      
      if (newBadges.length > 0) {
        // Show notification for the first new badge
        const newBadge = badges.find(b => b.id === newBadges[0] && b.earned);
        if (newBadge) {
          showToast(
            `Congratulations! You've earned the "${newBadge.badge_name}" badge!`,
            'badge',
            {
              icon: newBadge.badge_icon,
              name: newBadge.badge_name,
              rarity: newBadge.badge_rarity
            }
          );
        }
        
        // Update previous badges
        setPreviousBadges(currentEarnedBadges);
      }
    }
  }, [badges, previousBadges]);

  // Show journal loading state
  if (journalLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your journal...</p>
        </motion.div>
      </div>
    );
  }

  // Show journal error state
  if (journalError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-zen-sage-800 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-zen-sage-600 mb-6">{journalError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Show history view
  if (currentView === 'history') {
    return <MoodHistoryScreen 
      onBack={() => setCurrentView('journal')} 
      profile={profile}
    />;
  }

  // Show settings view
  if (currentView === 'settings') {
    return <SettingsScreen onBack={() => setCurrentView('journal')} />;
  }

  // Show badges view
  if (currentView === 'badges') {
    return <BadgesScreen onBack={() => setCurrentView('journal')} />;
  }
  
  // Show premium view
  if (currentView === 'premium') {
    return <PremiumPage onBack={() => setCurrentView('journal')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Trial Warning Banner */}
      {showTrialWarning && (
        <motion.div
          className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-200 dark:border-amber-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-800 dark:text-amber-200 font-medium">
                  Your free trial ends in {trialStatus?.daysRemaining} day{trialStatus?.daysRemaining !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setCurrentView('premium')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
      {/* Header */}
      <motion.header
        className="relative z-10 p-4 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-3">
          <Logo size="md" />
          <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">Zensai</h1>
          <p className="text-xs text-zen-sage-600 dark:text-gray-400">with Zeno</p>
          {!isSupabaseConnected && (
            <span className="bg-amber-100 text-amber-800 px-2 py-1 text-xs rounded-full">
              Connect to Supabase
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('history')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Journal Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentView('badges')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300 relative"
          >
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Badges</span>
            {badges.filter(b => b.earned).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-zen-peach-400 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {badges.filter(b => b.earned).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('premium')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Premium</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className="flex items-center space-x-2 px-3 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={logout}
            className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pb-8">
        {!isSupabaseConnected && (
          <motion.div 
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-amber-800 mb-2">
              Please connect to Supabase to enable database functionality.
            </p>
            <p className="text-amber-600 text-sm">
              Click the "Connect to Supabase" button in the top right corner.
            </p>
          </motion.div>
        )}
        
        {/* Welcome Section */}
        <WelcomeSection 
          user={user}
          streak={typeof getStreak === 'function' ? getStreak() : 0}
          bestStreak={typeof getBestStreak === 'function' ? getBestStreak() : 0}
          totalEntries={getTotalEntries()}
          alreadyJournaledToday={hasEntryToday()}
          contextualMessage={getContextualMessage()}
        />

        {/* Zeno Avatar */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative">
            <LottieAvatar 
              variant={randomZenoVariant} 
              size="lg" 
            />
          </div>
        </motion.div>

        {/* Journal Entry Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
              <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-zen-mint-500" />
                <span>Journal Entry</span>
              </h3>
              
              <HomeScreen />
            </div>
          </div>

          {/* Sidebar with Badge Widget */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <BadgeWidget 
              badges={badges} 
              onViewAllBadges={() => setCurrentView('badges')}
            />
          </motion.div>
        </div>
      </main>

      {/* Toast Notification */}
      <ToastNotification
        isVisible={toastVisible}
        message={toastMessage}
        type={toastType}
        badge={toastBadge}
        onClose={() => setToastVisible(false)}
        duration={toastType === 'badge' ? 8000 : 5000}
      />

      {/* Upsell Modal */}
      <UpsellModal
        isOpen={isUpsellModalOpen}
        onClose={hideUpsellModal}
        featureName={upsellContent?.featureName || 'Premium Feature'}
        featureDescription={upsellContent?.featureDescription || 'Upgrade to unlock premium features'}
      />
    </div>
  );
}