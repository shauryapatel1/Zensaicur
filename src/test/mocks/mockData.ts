import { MoodLevel } from '../../types';

/**
 * Mock user data
 */
export const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  joinedDate: new Date('2023-01-01')
};

/**
 * Mock profile data
 */
export const mockProfile = {
  user_id: 'user-123',
  name: 'Test User',
  current_streak: 3,
  best_streak: 5,
  last_entry_date: '2023-06-15',
  journaling_goal_frequency: 3,
  total_badges_earned: 2,
  subscription_status: 'free',
  subscription_tier: 'free',
  subscription_expires_at: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-06-15T00:00:00Z'
};

/**
 * Mock premium profile data
 */
export const mockPremiumProfile = {
  ...mockProfile,
  subscription_status: 'premium',
  subscription_tier: 'premium_plus',
  subscription_expires_at: '2024-06-15T00:00:00Z'
};

/**
 * Mock journal entries
 */
export const mockJournalEntries = [
  {
    id: 'entry-1',
    user_id: 'user-123',
    content: 'Today was a great day! I went for a walk in the park and enjoyed the sunshine.',
    title: 'Great Day',
    mood: 'good',
    photo_url: null,
    photo_filename: null,
    created_at: '2023-06-15T10:00:00Z',
    updated_at: '2023-06-15T10:00:00Z'
  },
  {
    id: 'entry-2',
    user_id: 'user-123',
    content: 'Feeling a bit down today. The weather is gloomy and I didn\'t sleep well.',
    title: null,
    mood: 'low',
    photo_url: null,
    photo_filename: null,
    created_at: '2023-06-14T09:30:00Z',
    updated_at: '2023-06-14T09:30:00Z'
  },
  {
    id: 'entry-3',
    user_id: 'user-123',
    content: 'Just a normal day. Nothing special happened.',
    title: 'Normal Day',
    mood: 'neutral',
    photo_url: 'https://example.com/photo.jpg',
    photo_filename: 'photo.jpg',
    created_at: '2023-06-13T14:20:00Z',
    updated_at: '2023-06-13T14:20:00Z'
  }
];

/**
 * Mock badges
 */
export const mockBadges = [
  {
    id: 'badge-1',
    badge_name: 'First Steps',
    badge_description: 'Complete your very first journal entry',
    badge_icon: '🌱',
    badge_category: 'milestone',
    badge_rarity: 'common',
    earned: true,
    earned_at: '2023-01-02T10:00:00Z',
    progress_current: 1,
    progress_target: 1,
    progress_percentage: 100
  },
  {
    id: 'badge-2',
    badge_name: 'Daily Habit',
    badge_description: 'Maintain a 3-day journaling streak',
    badge_icon: '🔥',
    badge_category: 'streak',
    badge_rarity: 'common',
    earned: true,
    earned_at: '2023-06-15T10:00:00Z',
    progress_current: 3,
    progress_target: 3,
    progress_percentage: 100
  },
  {
    id: 'badge-3',
    badge_name: 'Week Warrior',
    badge_description: 'Maintain a 7-day journaling streak',
    badge_icon: '⚡',
    badge_category: 'streak',
    badge_rarity: 'rare',
    earned: false,
    earned_at: null,
    progress_current: 3,
    progress_target: 7,
    progress_percentage: 43
  }
];

/**
 * Mock mood data
 */
export const mockMoods = [
  {
    level: 1 as MoodLevel,
    emoji: '😢',
    label: 'Struggling',
    color: 'red-400',
    description: "It's okay to have tough days. I'm here with you."
  },
  {
    level: 2 as MoodLevel,
    emoji: '😔',
    label: 'Low',
    color: 'orange-400',
    description: "Take it one step at a time. You're stronger than you know."
  },
  {
    level: 3 as MoodLevel,
    emoji: '😐',
    label: 'Neutral',
    color: 'yellow-400',
    description: "Every day is a new opportunity to grow and feel better."
  },
  {
    level: 4 as MoodLevel,
    emoji: '😊',
    label: 'Good',
    color: 'zen-mint-400',
    description: "I love seeing you happy! Keep nurturing those positive feelings."
  },
  {
    level: 5 as MoodLevel,
    emoji: '🤗',
    label: 'Amazing',
    color: 'zen-peach-400',
    description: "Your joy fills my heart! Let's celebrate this wonderful moment."
  }
];