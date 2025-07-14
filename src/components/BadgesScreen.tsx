import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Star, Filter, Search, Award, Target, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { useEffect } from 'react';
import { BADGES } from '../constants/uiStrings';
import BadgeCollection from './BadgeCollection';
import Logo from './Logo';
import LottieAvatar from './LottieAvatar';

interface BadgesScreenProps {
  onBack: () => void;
}

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

export default function BadgesScreen({ onBack }: BadgesScreenProps) {
  const { user } = useAuth();
  const { badges, isLoading, refreshData } = useJournal();

  // Refresh data when component mounts to ensure badges are up-to-date
  useEffect(() => {
    // Only refresh once when component mounts
    console.log('BadgesScreen: Refreshing data on mount');
    refreshData();
    // refreshData is now properly memoized, so it won't cause infinite loops
  }, [refreshData]);

  // Statistics
  const stats = useMemo(() => {
    const earned = badges.filter(b => b.earned).length;
    const total = badges.length;
    return { earned, total };
  }, [badges]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your badges...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-zen-peach-500" />
                {BADGES.TITLE || "Badge Collection"}
              </h1>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                {stats.earned} of {badges.length} badges earned
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <BadgeCollection badges={badges} />
      </div>
    </div>
  );
}