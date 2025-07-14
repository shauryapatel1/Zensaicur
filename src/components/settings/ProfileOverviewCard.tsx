import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Heart, Calendar } from 'lucide-react';
import LottieAvatar from '../LottieAvatar';

/**
 * ProfileOverviewCard - Displays user profile information and statistics
 * 
 * @component
 * @param {string} name - User's display name
 * @param {string} email - User's email address
 * @param {string} joinedDate - Formatted date when user joined
 * @param {number} currentStreak - User's current journaling streak
 * @param {number} bestStreak - User's best journaling streak
 * @param {number} totalBadgesEarned - Total number of badges earned
 * 
 * @example
 * return (
 *   <ProfileOverviewCard
 *     name="John Doe"
 *     email="john@example.com"
 *     joinedDate="January 1, 2023"
 *     currentStreak={5}
 *     bestStreak={10}
 *     totalBadgesEarned={8}
 *   />
 * )
 */
interface ProfileOverviewCardProps {
  name: string;
  email: string;
  joinedDate: string;
  currentStreak?: number;
  bestStreak?: number;
  totalBadgesEarned: number;
}

const ProfileOverviewCard = React.memo(function ProfileOverviewCard({
  name,
  email,
  joinedDate,
  currentStreak = 0,
  bestStreak = 0,
  totalBadgesEarned
}: ProfileOverviewCardProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20 text-center">
      <div className="flex justify-center mb-4">
        <LottieAvatar mood={4} size="lg" variant="greeting" aria-label="Your Zeno fox companion, looking happy" />
      </div>

      <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-2">
        {name}
      </h2>
      
      <p className="text-zen-sage-600 dark:text-gray-400 mb-4">{email}</p>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-zen-sage-600 dark:text-gray-400">Member since:</span>
          <span className="font-medium text-zen-sage-800 dark:text-gray-200">
            {joinedDate}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-zen-sage-600 dark:text-gray-400">Current streak:</span>
          <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'} 
            {currentStreak > 0 && <Heart className="w-4 h-4 ml-1 text-zen-peach-500" aria-hidden="true" />}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-zen-sage-600 dark:text-gray-400">Best streak:</span>
          <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
            {bestStreak} {bestStreak === 1 ? 'day' : 'days'} 
            {bestStreak > 0 && <Calendar className="w-4 h-4 ml-1 text-zen-mint-500" aria-hidden="true" />}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-zen-sage-600 dark:text-gray-400">Badges earned:</span>
          <span className="font-medium text-zen-sage-800 dark:text-gray-200 flex items-center">
            {totalBadgesEarned || 0} badges
            {(totalBadgesEarned || 0) > 0 && <Trophy className="w-4 h-4 ml-1 text-zen-peach-500" aria-hidden="true" />}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ProfileOverviewCard;