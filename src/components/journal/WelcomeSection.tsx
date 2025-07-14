import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../../contexts/AuthContext';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * WelcomeSection - Displays welcome message, date, and journal statistics
 * 
 * @component
 * @param {User|null} user - Current user object
 * @param {number} totalEntries - Total number of journal entries
 * @param {boolean} alreadyJournaledToday - Whether user has journaled today
 * @param {string} [contextualMessage] - Optional contextual message based on recent activity
 * 
 * @example
 * return (
 *   <WelcomeSection
 *     user={currentUser}
 *     totalEntries={42}
 *     alreadyJournaledToday={true}
 *     contextualMessage="Welcome back! I've been thinking about our last conversation."
 *   />
 * )
 */
interface WelcomeSectionProps {
  user: User | null;
  streak?: number;
  bestStreak?: number;
  totalEntries: number;
  alreadyJournaledToday: boolean;
  contextualMessage?: string;
}

const WelcomeSection = React.memo(function WelcomeSection({
  user,
  streak = 0,
  bestStreak = 0,
  totalEntries,
  alreadyJournaledToday,
  contextualMessage
}: WelcomeSectionProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || 'friend';
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <motion.div
      className="text-center mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <h2 className="text-3xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
        {getGreeting()}
       <span className="sr-only">Welcome to your journal. This is where you can record your thoughts and feelings.</span>
      </h2>
      <p className="text-zen-sage-600 dark:text-gray-400 mb-4">{getCurrentDate()}</p>
      
      {/* Stats */}
      <div className="space-y-4 mb-6">
          {/* Current Streak */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          > 
            <div className="text-2xl font-bold text-zen-mint-600 dark:text-zen-mint-400">{streak}</div>
            <div className="text-sm text-zen-sage-600 dark:text-gray-400">Current {streak === 1 ? 'Day' : 'Days'}</div>
          </motion.div>
          
          {/* Best Streak */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          > 
            <div className="text-2xl font-bold text-zen-peach-600 dark:text-zen-peach-400">{bestStreak}</div>
            <div className="text-sm text-zen-sage-600 dark:text-gray-400">Best {bestStreak === 1 ? 'Streak' : 'Streak'}</div>
          </motion.div>
          
        {/* Total Entries Stat */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        > 
          <div className="text-2xl font-bold text-zen-lavender-600 dark:text-zen-lavender-400">{totalEntries}</div>
          <div className="text-sm text-zen-sage-600 dark:text-gray-400">Total {totalEntries === 1 ? 'Entry' : 'Entries'}</div>
        </motion.div>

        {/* Already journaled today message */}
        {alreadyJournaledToday && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="inline-flex items-center space-x-2 bg-zen-mint-50 dark:bg-gray-700 px-4 py-2 rounded-full border border-zen-mint-200 dark:border-gray-600">
              <span className="text-sm text-zen-sage-700 dark:text-gray-300 font-medium">
                You've already journaled today! Feel free to add another entry.
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Contextual Message */}
      {contextualMessage && (
        <motion.div
          className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-zen-mint-200 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <p className="text-zen-sage-700 dark:text-gray-300 font-medium">
            {contextualMessage}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
});

export default WelcomeSection;