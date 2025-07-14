import { Mood } from '../types';

export const moods: Mood[] = [
  {
    level: 1,
    emoji: '😢',
    label: 'Struggling',
    color: 'red-400',
    description: "It's okay to have tough days. I'm here with you."
  },
  {
    level: 2,
    emoji: '😔',
    label: 'Low',
    color: 'orange-400',
    description: "Take it one step at a time. You're stronger than you know."
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Neutral',
    color: 'yellow-400',
    description: "Every day is a new opportunity to grow and feel better."
  },
  {
    level: 4,
    emoji: '😊',
    label: 'Good',
    color: 'zen-mint-400',
    description: "I love seeing you happy! Keep nurturing those positive feelings."
  },
  {
    level: 5,
    emoji: '🤗',
    label: 'Amazing',
    color: 'zen-peach-400',
    description: "Your joy fills my heart! Let's celebrate this wonderful moment."
  }
];