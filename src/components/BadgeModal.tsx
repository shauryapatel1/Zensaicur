import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Target, Trophy, Sparkles, Star, Lock } from 'lucide-react';
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
 * BadgeModal - Displays detailed information about a badge in a modal dialog
 * 
 * @component
 * @param {Badge|null} badge - Badge data to display
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * 
 * @example
 * return (
 *   <BadgeModal
 *     badge={selectedBadge}
 *     isOpen={isModalOpen}
 *     onClose={() => setIsModalOpen(false)}
 *   />
 * )
 */
interface BadgeModalProps {
  badge: Badge | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BadgeModal({ badge, isOpen, onClose }: BadgeModalProps) {
  if (!badge) return null;

  const getRarityColors = () => {
    switch (badge.badge_rarity) {
      case 'legendary':
        return {
          bg: 'from-yellow-200 to-yellow-300 dark:from-yellow-800 dark:to-yellow-700',
          border: 'border-yellow-400 dark:border-yellow-600',
          text: 'text-yellow-800 dark:text-yellow-200',
          accent: 'bg-yellow-400'
        };
      case 'epic':
        return {
          bg: 'from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-700',
          border: 'border-purple-400 dark:border-purple-600',
          text: 'text-purple-800 dark:text-purple-200',
          accent: 'bg-purple-400'
        };
      case 'rare':
        return {
          bg: 'from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700',
          border: 'border-blue-400 dark:border-blue-600',
          text: 'text-blue-800 dark:text-blue-200',
          accent: 'bg-blue-400'
        };
      default:
        return {
          bg: 'from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600',
          border: 'border-gray-400 dark:border-gray-500',
          text: 'text-gray-800 dark:text-gray-200',
          accent: 'bg-gray-400'
        };
    }
  };

  const getCategoryIcon = () => {
    switch (badge.badge_category) {
      case 'streak':
        return <Calendar className="w-5 h-5" />;
      case 'milestone':
        return <Target className="w-5 h-5" />;
      case 'achievement':
        return <Trophy className="w-5 h-5" />;
      case 'special':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const getCategoryName = () => {
    switch (badge.badge_category) {
      case 'streak':
        return 'Streak Badge';
      case 'milestone':
        return 'Milestone Badge';
      case 'achievement':
        return 'Achievement Badge';
      case 'special':
        return 'Special Badge';
      default:
        return 'Badge';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressTips = () => {
    if (badge.earned) return null;

    switch (badge.badge_category) {
      case 'streak':
        return "Keep journaling daily to build your streak!";
      case 'milestone':
        return "Continue writing journal entries to reach this milestone.";
      case 'achievement':
        return "Complete the specific requirements to unlock this achievement.";
      case 'special':
        return "Special badges are earned through unique actions or events.";
      default:
        return "Keep using Zensai to unlock this badge!";
    }
  };

  const colors = getRarityColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-modal-title"
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-600/20 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`
              bg-gradient-to-r ${badge.earned ? colors.bg : 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'} 
              p-6 relative
            `}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                {/* Badge Icon */}
                <div className="text-6xl mb-4">
                  {badge.earned ? <span aria-hidden="true">{badge.badge_icon}</span> : <Lock className="w-16 h-16 mx-auto text-gray-400" aria-hidden="true" />}
                </div>

                {/* Badge Name */}
                <h2 id="badge-modal-title" className={`
                  text-2xl font-display font-bold mb-2
                  ${badge.earned ? colors.text : 'text-gray-600 dark:text-gray-400'}
                `}>
                  {badge.badge_name}
                </h2>

                {/* Category and Rarity */}
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className={`
                    flex items-center space-x-1 px-3 py-1 rounded-full
                    ${badge.earned ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}
                  `}>
                    <span aria-hidden="true">{getCategoryIcon()}</span>
                    <span className={`
                      text-sm font-medium
                      ${badge.earned ? colors.text : 'text-gray-600 dark:text-gray-400'}
                    `}>
                      {getCategoryName()}
                    </span>
                  </div>

                  <span className={`
                    px-3 py-1 text-sm font-bold rounded-full capitalize
                    ${badge.badge_rarity === 'legendary' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                      badge.badge_rarity === 'epic' ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
                      badge.badge_rarity === 'rare' ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' :
                      'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                    }
                  `}>
                    {badge.badge_rarity}
                  </span>
                </div>

                {/* Earned Indicator */}
                {badge.earned && (
                  <motion.div
                    className="inline-flex items-center space-x-2 bg-zen-mint-400 text-white px-4 py-2 rounded-full"
                    aria-live="polite"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span className="font-medium">Earned!</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2" id="badge-description">
                  Description
                </h3>
                <p className="text-zen-sage-600 dark:text-gray-400 leading-relaxed" aria-labelledby="badge-description">
                  {badge.badge_description}
                </p>
              </div>

              {/* Progress Section */}
              {!badge.earned && badge.progress_target > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-3">
                    Progress
                  </h3>
                  
                  <div className="bg-zen-sage-50 dark:bg-gray-700 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-zen-sage-700 dark:text-gray-300">
                        {badge.progress_current} / {badge.progress_target}
                      </span>
                      <span className="text-sm font-bold text-zen-mint-600">
                        {badge.progress_percentage}%
                      </span>
                    </div>
                    
                    <div 
                      className="w-full bg-zen-sage-200 dark:bg-gray-600 rounded-full h-3 mb-3"
                      role="progressbar"
                      aria-valuenow={badge.progress_percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <motion.div
                        className="bg-zen-mint-400 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${badge.progress_percentage}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                    
                    <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                      {getProgressTips()}
                    </p>
                  </div>
                </div>
              )}

              {/* Earned Date */}
              {badge.earned && badge.earned_at && (
                <div className="mb-6">
                  <h3 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                    Earned On
                  </h3>
                  <div className="bg-zen-sage-50 dark:bg-gray-700 rounded-2xl p-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-zen-mint-500" aria-hidden="true" />
                      <span className="text-zen-sage-700 dark:text-gray-300 font-medium">
                        {formatDate(badge.earned_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rarity Information */}
              <div className="bg-gradient-to-r from-zen-mint-50 to-zen-lavender-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-4">
                <h3 className="text-sm font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  Rarity: {badge.badge_rarity.charAt(0).toUpperCase() + badge.badge_rarity.slice(1)}
                </h3>
                <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                  {badge.badge_rarity === 'legendary' && "Extremely rare badges for exceptional achievements."}
                  {badge.badge_rarity === 'epic' && "Rare badges for significant accomplishments."}
                  {badge.badge_rarity === 'rare' && "Uncommon badges for notable milestones."}
                  {badge.badge_rarity === 'common' && "Standard badges for regular achievements."}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}