/**
 * UI Strings for the Zensai application
 * This file centralizes all user-facing text to facilitate future localization
 */

export const APP_NAME = 'Zensai';
export const APP_TAGLINE = 'Journaling, but with a heart.';

// Premium Page
export const PREMIUM = {
  TITLE: 'Keep Your Journey Going',
  SUBTITLE: 'Your mindfulness journey continues here.',
  TRIAL_INFO: 'Your 7-day free trial has ended',
  MONTHLY: {
    NAME: 'Monthly Premium',
    PRICE: '$8.99',
    PERIOD: 'per month',
    FEATURES: [
      'Continue using all premium features after your trial',
      'Billed monthly',
      'Cancel anytime',
      'No interruption to your journaling experience',
    ]
  },
  YEARLY: {
    NAME: 'Yearly Premium',
    PRICE: '$59.99',
    PERIOD: 'per year',
    FEATURES: [
      'Continue using all premium features after your trial',
      'Save 44% compared to monthly',
      'Billed annually',
      'Cancel anytime',
      'No interruption to your journaling experience',
    ],
    POPULAR_TAG: 'Most Popular • Save 44%'
  },
  BENEFITS_SECTION: {
    TITLE: "Unlock Your Full Potential",
    SUBTITLE: "Continue your mindfulness journey without interruption",
    ITEMS: [
      {
        TITLE: "Uninterrupted Journaling",
        DESCRIPTION: "Continue your mindfulness practice without any limitations or restrictions."
      },
      {
        TITLE: "Complete Access",
        DESCRIPTION: "Maintain access to all the features you've been enjoying during your trial."
      },
      {
        TITLE: "Seamless Experience",
        DESCRIPTION: "Keep your journaling momentum going without disruption to your routine."
      },
      {
        TITLE: "Future Updates",
        DESCRIPTION: "Get immediate access to all new features as they're released."
      }
    ]
  },
  FEATURES_SECTION: {
    TITLE: 'Exclusive Premium Features',
    ITEMS: [
      {
        TITLE: 'AI-Powered Insights',
        DESCRIPTION: 'Personalized affirmations, mood analysis, and reflective prompts tailored just for you.'
      },
      {
        TITLE: 'Voice Synthesis',
        DESCRIPTION: 'Listen to your affirmations with natural-sounding voice that brings them to life.'
      },
      {
        TITLE: 'Unlimited Journaling',
        DESCRIPTION: 'No limits on entries, photos, or history - your complete journey in one place.'
      },
      {
        TITLE: 'Advanced Analytics',
        DESCRIPTION: 'Gain deeper insights into your emotional patterns and personal growth over time.'
      }
    ]
  },
  FAQ: {
    TITLE: 'Frequently Asked Questions',
    ITEMS: [
      {
        QUESTION: 'What happens after my 7-day free trial ends?',
        ANSWER: 'After your trial ends, you\'ll need to subscribe to continue using all premium features. If you don\'t subscribe, you\'ll lose access to premium features like voice affirmations, unlimited journaling, and advanced analytics.'
      },
      {
        QUESTION: 'Can I switch between monthly and yearly plans?',
        ANSWER: 'Yes, you can switch plans at any time. If you upgrade from monthly to yearly, you\'ll receive a prorated credit for your remaining monthly subscription. Switching from yearly to monthly will take effect at your next renewal date.'
      },
      {
        QUESTION: 'How do I cancel my subscription?',
        ANSWER: 'You can cancel your subscription anytime from the Settings page. Your premium features will remain active until the end of your current billing period.'
      },
      {
        QUESTION: 'Is my payment information secure?',
        ANSWER: 'Absolutely. All payments are processed securely through Stripe, a PCI-DSS Level 1 certified payment processor. We never store your credit card information on our servers, ensuring maximum security for your financial data.'
      }
    ]
  },
  BUTTONS: {
    SUBSCRIBE: 'Subscribe',
    CURRENT_PLAN: 'Current Plan',
    PROCESSING: 'Processing...',
    CONTINUE: 'Continue',
    CONTINUE: 'Continue'
  }, 
  TRIAL_NOTE: 'Your subscription begins immediately after your trial ends. Cancel anytime.',
  PLAN_SELECTION: {
    TITLE: 'Choose Your Plan',
    MONTHLY_BUTTON: 'Monthly',
    YEARLY_BUTTON: 'Yearly (Save 44%)',
    CONTINUE_BUTTON: 'Subscribe Now'
  },
  MOBILE_APPS: {
    TITLE: 'Coming Soon to Mobile',
    SUBTITLE: 'Take Zensai with you wherever you go',
    DESCRIPTION: 'We\'re working on native apps for iOS and Android. Available during your trial, and premium subscribers will continue to get early access when they launch.',
    ANDROID: 'Android App',
    IOS: 'iOS App',
    RELEASE_DATE: 'Expected Release: Q3 2025',
    EARLY_ACCESS: 'Premium subscribers get priority access'
  }
};

// Upsell Modal
export const UPSELL = {
  TITLE: 'Your Trial Has Ended',
  DEFAULT_FEATURE_NAME: 'Subscribe to Continue',
  DEFAULT_DESCRIPTION: 'Your free trial has ended. Subscribe to continue using Zensai.',
  FEATURES: [
    'Continue using all features',
    'No interruption to your journaling',
    'Access to future updates',
    'UPGRADE: Subscribe to Continue',
    'LATER: Maybe Later'
  ],
  TRIAL_NOTE: 'Your free trial has ended. Subscribe to continue using Zensai.'
};

// Journal
export const JOURNAL = {
  PROMPTS: [
    "What are three things you're grateful for today?",
    "How are you feeling right now, and what might be contributing to that feeling?",
    "What's one small thing that brought you joy today?",
    "If you could give your past self one piece of advice, what would it be?",
    "What's something you're looking forward to?",
    "Describe a moment today when you felt most like yourself.",
    "What's one thing you learned about yourself recently?",
    "How did you show kindness to yourself or others today?",
    "What would you like to let go of today?",
    "What's one thing you accomplished today, no matter how small?"
  ],
  MOOD_ENCOURAGEMENTS: {
    UPGRADE: 'Subscribe to Continue',
    LOW: 'Every small step forward is progress. You\'re doing great! 🌱',
    NEUTRAL: 'Balance is beautiful. You\'re exactly where you need to be. ⚖️',
    GOOD: 'Your positive energy is contagious! Keep shining! ✨',
    AMAZING: 'What a wonderful day to celebrate your joy! 🎉'
  },
  FALLBACK_AFFIRMATIONS: {
    STRUGGLING: 'You are stronger than you know, and this difficult moment will pass. Your feelings are valid, and you deserve compassion.',
    LOW: 'It\'s okay to have challenging days. You\'re human, and you\'re doing the best you can. Tomorrow brings new possibilities.',
    NEUTRAL: 'You are perfectly balanced in this moment. Trust in your journey and know that you are exactly where you need to be.',
    GOOD: 'Your positive energy lights up the world around you. Keep embracing the joy that flows through your life.',
    AMAZING: 'What a beautiful soul you are! Your happiness is a gift to yourself and everyone around you. Celebrate this wonderful moment!'
  },
  CONTEXTUAL_MESSAGES: {
    SAME_DAY: {
      STRUGGLING: 'I see you\'re going through a tough time. Remember, I\'m here with you every step of the way.',
      LOW: 'You\'ve been feeling low lately. Your courage to keep journaling shows your inner strength.',
      NEUTRAL: 'You\'re finding your balance. Each reflection brings you closer to understanding yourself.',
      GOOD: 'Your positive energy has been shining through your recent entries. Keep nurturing that light!',
      AMAZING: 'What a joy it is to see you flourishing! Your happiness radiates through your words.'
    },
    ONE_DAY: 'Welcome back! I\'ve been thinking about our last conversation.',
    FEW_DAYS: 'It\'s been {days} days since we last talked. I\'m glad you\'re here.',
    LONG_TIME: 'It\'s wonderful to have you back. I\'ve missed our conversations.'
  },
  SUCCESS_MESSAGES: {
    SAVED: 'Entry saved! Zeno is proud of you! 🎉',
    FIRST_ENTRY: 'Great start! You\'ve begun your journaling journey! 🌱',
  }
}

// Settings
export const SETTINGS = {
  PROFILE: {
    TITLE: 'Profile Information',
    EMAIL_READONLY: 'Email cannot be changed. Contact support if needed.',
    GOAL_HELP: 'Set your weekly journaling goal to stay motivated and track your progress.'
  },
  PREFERENCES: {
    TITLE: 'App Preferences',
    DARK_MODE: {
      LABEL: 'Dark Mode',
      ENABLED: 'Dark theme enabled',
      DISABLED: 'Light theme enabled'
    },
    NOTIFICATIONS: {
      LABEL: 'Notifications',
      DESCRIPTION: 'Gentle reminders for journaling'
    }
  },
  SUBSCRIPTION: {
    TITLE: 'Subscription',
    CURRENT_PLAN: 'Current Plan',
    PREMIUM_YEARLY: 'Premium Yearly',
    PREMIUM_MONTHLY: 'Premium Monthly', 
    FREE: 'Free',
    RENEWAL: 'Your subscription will renew on {date}',
    CANCELLED: 'Your subscription is cancelled and will end on {date}'
  },
  DATA_PRIVACY: {
    TITLE: 'Data & Privacy',
    EXPORT_BUTTON: 'Export Journal Data',
    EXPORT_HELP: 'Download all your journal entries and data in JSON format.'
  },
  ACCOUNT_ACTIONS: {
    TITLE: 'Account Actions',
    SIGN_OUT: 'Sign Out',
    DELETE_ACCOUNT: 'Delete Account',
    DELETE_CONFIRMATION: 'Type DELETE to confirm:'
  },
 SUPPORT: {
   TITLE: 'Need Help?',
   EMAIL: 'team@zensai.me',
   CONTACT: 'Contact our support team at'
 },
  MODALS: {
    LOGOUT: {
      TITLE: 'Sign Out',
      MESSAGE: 'Are you sure you want to sign out? You\'ll need to sign in again to access your journal.',
      CANCEL: 'Cancel',
      CONFIRM: 'Sign Out'
    },
    DELETE: {
      TITLE: 'Delete Account',
      MESSAGE: 'This action cannot be undone. All your journal entries, progress, and data will be permanently deleted.',
      CANCEL: 'Cancel',
      CONFIRM: 'Delete Account'
    }
  }
};

// Badges
export const BADGES = {
  TITLE: 'Badge Collection',
  PROGRESS: {
    TITLE: 'Badge Progress',
    EARNED: '{count} earned',
    TOTAL: '{count} total',
    MORE_TO_GO: '{count} more to go!',
    PERCENTAGE: '{percent}%'
  },
  SECTIONS: {
    ALMOST_THERE: 'Almost There!',
    RECENT: 'Recent Achievements'
  }
};

// History
export const HISTORY = {
  TITLE: 'Journal Dashboard',
  SEARCH_PLACEHOLDER: 'Search your journal entries...',
  FILTERS: {
    TITLE: 'Filters',
    ALL_MOODS: 'All Moods',
    NEWEST: 'Newest First',
    OLDEST: 'Oldest First',
    CLEAR: 'Clear filters'
  },
  ANALYTICS: {
    TITLE: 'Advanced Analytics',
    COMING_SOON: 'Advanced Insights Coming Soon',
    COMING_SOON_DESC: 'We\'re working on detailed mood trends, sentiment analysis, and AI-generated summaries of your emotional patterns. Available during your trial, and to premium subscribers after.',
    UNLOCK: 'Your Free Trial Has Ended',
    UNLOCK_DESC: 'Subscribe to Zensai Premium to continue accessing all features including advanced analytics, unlimited journal history, and more.'
  },
  HISTORY_LIMIT: {
    TITLE: 'Your Free Trial Has Ended',
    DESCRIPTION: 'Subscribe to Zensai Premium to continue accessing your complete journal history and all other features.'
  },
  EMPTY_STATE: {
    NO_ENTRIES: 'No entries found',
    WITH_FILTERS: 'Try adjusting your search or filters.',
    NO_FILTERS: 'Start journaling to see your entries here!'
  },
  ANALYTICS: {
    TITLE: 'Advanced Analytics',
    COMING_SOON: 'Advanced Insights Coming Soon',
    COMING_SOON_DESC: 'We\'re working on detailed mood trends, sentiment analysis, and AI-generated summaries of your emotional patterns. These will be available to all subscribers.',
    UNLOCK: 'Your Free Trial Has Ended',
    UNLOCK_DESC: 'Subscribe to Zensai Premium to continue accessing all features including advanced analytics, unlimited journal history, and more.'
  },
  HISTORY_LIMIT: {
    TITLE: 'Your Free Trial Has Ended',
    DESCRIPTION: 'Subscribe to Zensai Premium to continue accessing your complete journal history and all other features.'
  },
  EMPTY_STATE: {
    NO_ENTRIES: 'No entries found',
    WITH_FILTERS: 'Try adjusting your search or filters.',
    NO_FILTERS: 'Start journaling to see your entries here!'
  },
  MOOD_DISTRIBUTION: 'Mood Distribution'
};