import React from 'react';
import { motion } from 'framer-motion';
import { Star, Lock, Trophy, Calendar, Target, Sparkles } from 'lucide-react';
import { BADGES } from '../constants/uiStrings';

/**
 * Interface for badge data
 * @interface Badge
 */
interface Badge {
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
}

/**
 * BadgeCard - Displays a single badge with its details and progress
 * 
 * @component
 * @param {Badge} badge - Badge data to display
 * @param {'sm'|'md'|'lg'} [size='md'] - Size of the badge card
 * @param {boolean} [showProgress=true] - Whether to show progress information
 * @param {function} [onClick] - Function to call when badge is clicked
 * 
 * @example
 * return (
 *   <BadgeCard
 *     badge={badge}
 *     size="md"
 *     showProgress={true}
 *     onClick={() => handleBadgeClick(badge)}
 *   />
 * )
 */
interface BadgeCardProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

const BadgeCard = React.memo(function BadgeCard({ 
  badge, 
  size = 'md', 
  showProgress = true, 
  onClick 
}: BadgeCardProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };

  const getRarityColors = () => {
    switch (badge.badge_rarity) {
      case 'legendary':
        return {
          bg: 'from-yellow-200 to-yellow-300 dark:from-yellow-800 dark:to-yellow-700',
          border: 'border-yellow-400 dark:border-yellow-600',
          text: 'text-yellow-800 dark:text-yellow-200',
          glow: 'shadow-yellow-200 dark:shadow-yellow-800'
        };
      case 'epic':
        return {
          bg: 'from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-700',
          border: 'border-purple-400 dark:border-purple-600',
          text: 'text-purple-800 dark:text-purple-200',
          glow: 'shadow-purple-200 dark:shadow-purple-800'
        };
      case 'rare':
        return {
          bg: 'from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700',
          border: 'border-blue-400 dark:border-blue-600',
          text: 'text-blue-800 dark:text-blue-200',
          glow: 'shadow-blue-200 dark:shadow-blue-800'
        };
      default:
        return {
          bg: 'from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600',
          border: 'border-gray-400 dark:border-gray-500',
          text: 'text-gray-800 dark:text-gray-200',
          glow: 'shadow-gray-200 dark:shadow-gray-700'
        };
    }
  };

  const getCategoryIcon = () => {
    switch (badge.badge_category) {
      case 'streak':
        return <Calendar className="w-4 h-4" />;
      case 'milestone':
        return <Target className="w-4 h-4" />;
      case 'achievement':
        return <Trophy className="w-4 h-4" />;
      case 'special':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const colors = getRarityColors();

  return (
    <motion.div
      className={`
        relative rounded-2xl border-2 transition-all duration-300 cursor-pointer
        ${badge.earned 
          ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg ${colors.glow}` 
          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
        }
        ${sizeClasses[size]}
      `}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${badge.badge_name} badge - ${badge.earned ? 'Earned' : 'Not yet earned'}`}
      whileHover={{ scale: badge.earned ? 1.05 : 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Rarity Badge */}
      <div className="absolute top-2 right-2">
        <span className={`
          px-2 py-1 text-xs font-bold rounded-full capitalize
          px-2 py-1 text-xs font-bold rounded-full capitalize
          ${badge.badge_rarity === 'legendary' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
            badge.badge_rarity === 'epic' ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
            badge.badge_rarity === 'rare' ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' :
            'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
          }
        `}>
          {badge.badge_rarity}
        </span>
      </div>

      {/* Category Icon */}
      <div className="absolute top-2 left-2">
        <div className={`
          p-1 rounded-full
          ${badge.earned ? colors.text : 'text-gray-500 dark:text-gray-400'}
        `}>
          {getCategoryIcon()}
        </div>
      </div>

      {/* Badge Content */}
      <div className="text-center mt-6">
        {/* Badge Icon */}
        <div className={`${iconSizes[size]} mb-3`}>
          {badge.earned ? badge.badge_icon : <Lock className="w-8 h-8 mx-auto text-gray-400" />}
        </div>

        {/* Badge Name */}
        <h3 className={`
          font-display font-bold mb-2
          ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm'}
          ${badge.earned ? colors.text : 'text-gray-600 dark:text-gray-400'}
        `}>
          {badge.badge_name}
        </h3>

        {/* Badge Description */}
        <p className={`
          text-sm opacity-80 leading-relaxed mb-3
          ${badge.earned ? colors.text : 'text-gray-500 dark:text-gray-500'}
        `}>
          {badge.badge_description}
        </p>

        {/* Progress Bar (for unearned badges) */}
        {!badge.earned && showProgress && badge.progress_target > 1 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{badge.progress_current}/{badge.progress_target}</span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
              <motion.div
                className="bg-zen-mint-400 h-2 rounded-full transition-all duration-500"
                role="presentation"
                role="presentation"
                initial={{ width: 0 }}
                animate={{ width: `${badge.progress_percentage}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* Earned Date */}
        {badge.earned && badge.earned_at && (
          <div className={`text-xs opacity-80 ${colors.text}`}>
            Earned {formatDate(badge.earned_at)}
          </div>
        )}
      </div>

      {/* Earned Indicator */}
      {badge.earned && (
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 bg-zen-mint-400 rounded-full flex items-center justify-center shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <Star className="w-4 h-4 text-white fill-current" />
        </motion.div>
      )}

      {/* Legendary Glow Effect */}
      {badge.earned && badge.badge_rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-300/20 to-yellow-400/20 rounded-2xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.div>
  );
});

export default BadgeCard;