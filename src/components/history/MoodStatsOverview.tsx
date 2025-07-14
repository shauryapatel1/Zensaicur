import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { MoodLevel } from '../../types';
import { HISTORY } from '../../constants/uiStrings'; 
import { moods } from '../../data/moods';

/**
 * MoodStatsOverview - Displays statistics about the user's mood distribution
 * 
 * @component
 * @param {Array} moodStats - Array of mood statistics with count and percentage
 * 
 * @example
 * return (
 *   <MoodStatsOverview moodStats={moodStats} />
 * )
 */
interface MoodStatsOverviewProps {
  moodStats: Array<{
    level: MoodLevel;
    count: number;
    percentage: number; 
  }>;
}

const MoodStatsOverview = React.memo(function MoodStatsOverview({ moodStats }: MoodStatsOverviewProps) {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
        <h2 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
          <Heart className="w-5 h-5 text-zen-peach-500" aria-hidden="true" />
          <span>{HISTORY.MOOD_DISTRIBUTION}</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {moodStats.map((mood) => (
            <motion.div
              key={mood.level.toString()}
              className="text-center p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl border border-zen-sage-100 dark:border-gray-600"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-3xl mb-2" aria-hidden="true">{moods.find(m => m.level === mood.level)?.emoji}</div>
              <div className="text-lg font-bold text-zen-sage-800 dark:text-gray-200 mb-1">
                {mood.count}
              </div> 
              <div className="text-xs text-zen-sage-600 dark:text-gray-400 mb-2">
                {moods.find(m => m.level === mood.level)?.label}
              </div> 
              <div 
                className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-2"
                role="progressbar"
                aria-valuenow={mood.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${mood.percentage}% of entries with ${moods.find(m => m.level === mood.level)?.label} mood`}
              >
                <motion.div
                  className="bg-zen-mint-400 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mood.percentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }} 
                />
              </div>
              <div className="text-xs text-zen-sage-500 dark:text-gray-400 mt-1">
                {Math.round(mood.percentage)}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export default MoodStatsOverview;