import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BADGES } from '../constants/uiStrings';

/**
 * BadgeWidget - Displays a summary of the user's badge collection
 * 
 * @component
 * @param {Array} badges - Array of badge objects
 * @param {function} onViewAllBadges - Function to navigate to the full badges screen
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return (
 *   <BadgeWidget
 *     badges={userBadges}
 *     onViewAllBadges={() => setCurrentView('badges')}
 *   />
 * )
 */
interface BadgeWidgetProps {
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
  onViewAllBadges: () => void;
  className?: string;
}

const BadgeWidget = React.memo(function BadgeWidget({ badges, onViewAllBadges, className = '' }: BadgeWidgetProps) {
  const earnedBadges = badges.filter(b => b.earned);
  const totalBadges = badges.length;
  const completionPercentage = totalBadges > 0 ? Math.round((earnedBadges.length / totalBadges) * 100) : 0;
  
  // Get the most recently earned badges (up to 3)
  const recentBadges = [...earnedBadges]
    .filter(b => b.earned_at)
    .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
    .slice(0, 3);
  
  // Get badges closest to being earned (up to 2)
  const upcomingBadges = badges
    .filter(b => !b.earned && b.progress_percentage > 0)
    .sort((a, b) => b.progress_percentage - a.progress_percentage)
    .slice(0, 2);
    
  // Log badge data for debugging
  useEffect(() => {
    console.log('BadgeWidget received badges:', badges.length);
    console.log('Earned badges:', earnedBadges.length);
    console.log('Upcoming badges:', upcomingBadges.length);
  }, [badges, earnedBadges.length, upcomingBadges.length]);
    
  // Log badge data for debugging
  useEffect(() => {
    console.log('BadgeWidget received badges:', badges.length);
    console.log('Earned badges:', earnedBadges.length);
    console.log('Upcoming badges:', upcomingBadges.length);
  }, [badges, earnedBadges.length, upcomingBadges.length]);
    
  // Log badge data for debugging
  useEffect(() => {
    console.log('BadgeWidget received badges:', badges.length);
    console.log('Earned badges:', earnedBadges.length);
    console.log('Upcoming badges:', upcomingBadges.length);
  }, [badges, earnedBadges.length, upcomingBadges.length]);

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
    <motion.div
      className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      role="region"
      aria-label="Your badges"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-zen-peach-500" aria-hidden="true" />
          <h3 className="font-display font-bold text-zen-sage-800 dark:text-gray-200" id="badge-widget-heading">
            {BADGES.PROGRESS.TITLE}
          </h3>
        </div>
        <button
          onClick={onViewAllBadges}
          aria-label="View all badges"
          className="flex items-center space-x-1 text-sm text-zen-mint-600 hover:text-zen-mint-700 font-medium"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4" aria-labelledby="badge-widget-heading">
        <div className="flex justify-between text-sm text-zen-sage-600 dark:text-gray-400 mb-2">
          <span>{BADGES.PROGRESS.EARNED.replace('{count}', earnedBadges.length.toString())}</span>
          <span>{totalBadges} total</span>
        </div>
        <div 
          className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-2"
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completionPercentage}% of badges earned`}
        >
          <motion.div
            className="bg-gradient-to-r from-zen-mint-400 to-zen-peach-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      {/* Recent Badges */}
      <div className="space-y-4">
        {recentBadges.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" id="recently-earned-heading"> 
              {BADGES.SECTIONS.RECENT}
            </h4>
            <div className="space-y-2" aria-labelledby="recently-earned-heading">
              {recentBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  className="flex items-center space-x-3 p-2 bg-zen-mint-50 dark:bg-gray-700 rounded-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  tabIndex={0}
                >
                  <div className="text-2xl" aria-hidden="true">{badge.badge_icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h5 className="font-medium text-zen-sage-800 dark:text-gray-200 truncate mr-2">
                        {badge.badge_name}
                      </h5>
                      <span className={`text-xs font-medium capitalize ${getRarityColor(badge.badge_rarity)}`}>
                        {badge.badge_rarity}
                      </span>
                    </div>
                    {badge.earned_at && (
                      <p className="text-xs text-zen-sage-500 dark:text-gray-500">
                        {new Date(badge.earned_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Badges */}
        {upcomingBadges.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" id="almost-there-heading"> 
              {BADGES.SECTIONS.ALMOST_THERE}
            </h4>
            <div className="space-y-2" aria-labelledby="almost-there-heading">
              {upcomingBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  className="p-2 bg-zen-sage-50 dark:bg-gray-700 rounded-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  tabIndex={0}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl opacity-50" aria-hidden="true">{badge.badge_icon}</div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-zen-sage-800 dark:text-gray-200 truncate">
                        {badge.badge_name}
                      </h5>
                    </div>
                    <span className="text-sm font-bold text-zen-mint-600">
                      {badge.progress_current}/{badge.progress_target}
                    </span>
                  </div>
                  <div 
                    className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-1.5"
                    role="progressbar"
                    aria-valuenow={badge.progress_percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${badge.progress_percentage}% progress towards ${badge.badge_name} badge`}
                  >
                    <motion.div
                      className="bg-zen-mint-400 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${badge.progress_percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Badges Message */}
      {earnedBadges.length === 0 && upcomingBadges.length === 0 && (
        <div className="mb-4">
          <p className="text-zen-sage-600 dark:text-gray-400 text-center py-4" aria-live="polite">
            Start earning badges by journaling regularly!
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default BadgeWidget;