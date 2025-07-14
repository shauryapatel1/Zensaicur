import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { BADGES } from '../constants/uiStrings';

/**
 * BadgeProgress - Displays overall badge progress and achievement statistics
 * 
 * @component
 * @param {Array} badges - Array of badge objects with progress information
 * 
 * @example
 * return <BadgeProgress badges={userBadges} />
 */
interface BadgeProgressProps {
  badges: Array<{
    id: string;
    badge_name: string;
    badge_description: string;
    badge_icon: string;
    badge_category: string;
    badge_rarity: string;
    earned: boolean;
    earned_at: string | null;
    progress_current: number;
    progress_target: number;
    progress_percentage: number;
  }>;
}

const BadgeProgress = React.memo(function BadgeProgress({ badges }: BadgeProgressProps) {
  const earnedBadges = badges.filter(b => b.earned);
  const totalBadges = badges.length;
  const completionPercentage = totalBadges > 0 ? Math.round((earnedBadges.length / totalBadges) * 100) : 0;

  // Get badges closest to completion
  const nearCompletionBadges = badges
    .filter(b => !b.earned && b.progress_target > 1)
    .sort((a, b) => b.progress_percentage - a.progress_percentage)
    .slice(0, 3);

  // Get recent earned badges
  const recentBadges = earnedBadges
    .filter(b => b.earned_at)
    .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
    .slice(0, 3);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak':
        return <Calendar className="w-4 h-4" />;
      case 'milestone':
        return <Target className="w-4 h-4" />;
      case 'achievement':
        return <Trophy className="w-4 h-4" />;
      case 'special':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'epic':
        return 'text-purple-600 dark:text-purple-400';
      case 'rare':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <motion.div
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        role="region"
        aria-label="Badge progress overview"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-zen-mint-500" aria-hidden="true" />
            {BADGES.PROGRESS.TITLE}
          </h3>
          <span className="text-2xl font-bold text-zen-mint-600">
            {completionPercentage}%
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-zen-sage-600 dark:text-gray-400 mb-2">
            <span>{BADGES.PROGRESS.EARNED.replace('{count}', earnedBadges.length.toString())}</span>
            <span>{totalBadges} total</span>
          </div>
          <div 
            className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-3"
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${completionPercentage}% of badges earned`}
          >
            <motion.div
              className="bg-gradient-to-r from-zen-mint-400 to-zen-peach-400 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1.5, delay: 0.2 }}
            />
          </div>
        </div>

        <p className="text-sm text-zen-sage-600 dark:text-gray-400">
          {earnedBadges.length} earned out of {totalBadges} available badges.
          {totalBadges - earnedBadges.length > 0 && ` ${totalBadges - earnedBadges.length} more to go!`}
        </p>
      </motion.div>

      {/* Near Completion */}
      {nearCompletionBadges.length > 0 && (
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          role="region"
          aria-label="Badges you're close to earning"
        >
          <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-zen-peach-500" aria-hidden="true" />
            {BADGES.SECTIONS.ALMOST_THERE}
          </h3>

          <div className="space-y-3">
            {nearCompletionBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                className="flex items-center space-x-4 p-3 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="text-2xl" aria-hidden="true">{badge.badge_icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">
                      {badge.badge_name}
                    </h4>
                    <span className="text-sm font-bold text-zen-mint-600">
                      {badge.progress_current} / {badge.progress_target}
                    </span>
                  </div>
                  <div 
                    className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-2 mb-1"
                    role="progressbar"
                    aria-valuenow={badge.progress_percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${badge.progress_percentage}% progress towards ${badge.badge_name}`}
                  >
                    <motion.div
                      className="bg-zen-mint-400 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${badge.progress_percentage}%` }}
                      transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zen-sage-600 dark:text-gray-400">
                      {badge.badge_category === 'streak' ? 'days' : 'entries'}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span aria-hidden="true">{getCategoryIcon(badge.badge_category)}</span>
                      <span className={`text-xs font-medium capitalize ${getRarityColor(badge.badge_rarity)}`}>
                        {badge.badge_rarity}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Achievements */}
      {recentBadges.length > 0 && (
        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          role="region"
          aria-label="Recently earned badges"
        >
          <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-zen-peach-500" aria-hidden="true" />
            {BADGES.SECTIONS.RECENT}
          </h3>

          <div className="space-y-3">
            {recentBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                className="flex items-center space-x-4 p-3 bg-gradient-to-r from-zen-mint-50 to-zen-peach-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <div className="text-2xl" aria-hidden="true">{badge.badge_icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">
                      {badge.badge_name}
                    </h4>
                    <div className="flex items-center space-x-1">
                      <span aria-hidden="true">{getCategoryIcon(badge.badge_category)}</span>
                      <span className={`text-xs font-medium capitalize ${getRarityColor(badge.badge_rarity)}`}>
                        {badge.badge_rarity}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-zen-sage-600 dark:text-gray-400 mb-1">
                    {badge.badge_description}
                  </p>
                  {badge.earned_at && (
                    <p className="text-xs text-zen-sage-500 dark:text-gray-500" aria-live="polite">
                      Earned on {new Date(badge.earned_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
});

export default BadgeProgress;