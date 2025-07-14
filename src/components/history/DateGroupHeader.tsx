import React from 'react';
import { motion } from 'framer-motion';
import { MoodLevel } from '../../types';
import { moods } from '../../data/moods';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * DateGroupHeader - Displays a header for a group of journal entries from the same date
 * 
 * @component
 * @param {string} date - Date string for the group
 * @param {Array} entries - Array of entries for this date
 * @param {number} index - Index of this date group
 * 
 * @example
 * return (
 *   <DateGroupHeader
 *     date="Mon Jun 15 2023"
 *     entries={dayEntries}
 *     index={0}
 *   />
 * )
 */
interface DateGroupHeaderProps {
  date: string;
  entries: Array<{
    id: string;
    mood: string;
    created_at: string;
  }>;
  index: number;
}

const DateGroupHeader = React.memo(function DateGroupHeader({
  date,
  entries,
  index
}: DateGroupHeaderProps) {
  // Calculate average mood for the day
  const averageMood = entries.reduce((sum, entry) => 
    sum + getMoodLevel(entry.mood), 0
  ) / entries.length;
  
  const roundedMood = Math.round(averageMood) as MoodLevel;
  const dayMoodData = moods.find(m => m.level === roundedMood);

  function getMoodLevel(moodString: string): MoodLevel {
    const moodMap: Record<string, MoodLevel> = {
      'struggling': 1,
      'low': 2,
      'neutral': 3,
      'good': 4,
      'amazing': 5
    };
    return moodMap[moodString] || 3;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();
    
    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === yesterdayOnly) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <motion.div
      className="flex items-center space-x-4 mb-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-center space-x-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/20 dark:border-gray-600/20">
        <div className="text-3xl" aria-hidden="true">{dayMoodData?.emoji}</div>
        <div>
          <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200">
            {formatDate(entries[0].created_at)}
          </h3>
          <p className="text-sm text-zen-sage-600 dark:text-gray-400">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} • Average mood: {dayMoodData?.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export default DateGroupHeader;