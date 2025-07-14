import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, ChevronUp, Trophy, Calendar, Target, Sparkles } from 'lucide-react';
import BadgeCard from './BadgeCard';
import BadgeModal from './BadgeModal';
import { BADGES } from '../constants/uiStrings';
import BadgeProgress from './BadgeProgress';

/**
 * BadgeCollection - Displays a collection of badges with filtering and search
 * 
 * @component
 * @param {Array} badges - Array of badge objects
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return <BadgeCollection badges={userBadges} />
 */
interface BadgeCollectionProps {
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
  className?: string;
}

const BadgeCollection = React.memo(function BadgeCollection({ badges, className = '' }: BadgeCollectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyEarned, setShowOnlyEarned] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<typeof badges[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter badges based on selected filters
  const filteredBadges = useMemo(() => {
    return badges.filter(badge => {
      const matchesCategory = selectedCategory === 'all' || badge.badge_category === selectedCategory;
      const matchesRarity = selectedRarity === 'all' || badge.badge_rarity === selectedRarity;
      const matchesSearch = searchTerm === '' || 
        badge.badge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.badge_description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEarned = !showOnlyEarned || badge.earned;
      
      return matchesCategory && matchesRarity && matchesSearch && matchesEarned;
    });
  }, [badges, selectedCategory, selectedRarity, searchTerm, showOnlyEarned]);

  // Group badges by category
  const groupedBadges = useMemo(() => {
    const groups: Record<string, typeof badges> = {};
    filteredBadges.forEach(badge => {
      if (!groups[badge.badge_category]) {
        groups[badge.badge_category] = [];
      }
      groups[badge.badge_category].push(badge);
    });
    return groups;
  }, [filteredBadges]);

  // Statistics
  const stats = useMemo(() => {
    const earned = badges.filter(b => b.earned).length;
    const total = badges.length;
    const byRarity = badges.reduce((acc, badge) => {
      if (badge.earned) {
        acc[badge.badge_rarity] = (acc[badge.badge_rarity] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return { earned, total, byRarity };
  }, [badges]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak':
        return <Calendar className="w-5 h-5" />;
      case 'milestone':
        return <Target className="w-5 h-5" />;
      case 'achievement':
        return <Trophy className="w-5 h-5" />;
      case 'special':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Trophy className="w-5 h-5" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'streak':
        return 'Streak Badges';
      case 'milestone':
        return 'Milestone Badges';
      case 'achievement':
        return 'Achievement Badges';
      case 'special':
        return 'Special Badges';
      default:
        return 'Badges';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedRarity('all');
    setShowOnlyEarned(false);
  };

  const handleBadgeClick = (badge: typeof badges[0]) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Badge Progress Overview */}
      <BadgeProgress badges={badges} />

      {/* Search and Filters */}
      <motion.div
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search badges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {(searchTerm || selectedCategory !== 'all' || selectedRarity !== 'all' || showOnlyEarned) && (
            <button
              onClick={clearFilters}
              className="text-sm text-zen-mint-600 hover:text-zen-mint-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="mt-4 pt-4 border-t border-zen-sage-200 dark:border-gray-600"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Filter by category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                  >
                    <option value="all">All Categories</option>
                    <option value="streak">Streak</option>
                    <option value="milestone">Milestone</option>
                    <option value="achievement">Achievement</option>
                    <option value="special">Special</option>
                  </select>
                </div>

                {/* Rarity Filter */}
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Filter by rarity
                  </label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="w-full px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
                  >
                    <option value="all">All Rarities</option>
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>

                {/* Earned Filter */}
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
                    Show only
                  </label>
                  <button
                    onClick={() => setShowOnlyEarned(!showOnlyEarned)}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      showOnlyEarned
                        ? 'bg-zen-mint-400 text-white'
                        : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Earned Only</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Badges Grid */}
      <div className="space-y-8">
        {Object.keys(groupedBadges).length === 0 ? (
          <motion.div
            className="text-center py-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Trophy className="w-16 h-16 text-zen-sage-400 mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
              No badges found
            </h3>
            <p className="text-zen-sage-600 dark:text-gray-400">
              Try adjusting your filters to see more badges.
            </p>
          </motion.div>
        ) : (
          Object.entries(groupedBadges).map(([category, categoryBadges], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + categoryIndex * 0.1 }}
            >
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
                <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 flex items-center space-x-2">
                  {getCategoryIcon(category)}
                  <span>{getCategoryName(category)}</span>
                  <span className="text-sm font-normal text-zen-sage-500 dark:text-gray-400">
                    ({categoryBadges.filter(b => b.earned).length}/{categoryBadges.length})
                  </span>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryBadges.map((badge) => (
                    <BadgeCard 
                      key={badge.id} 
                      badge={badge} 
                      onClick={() => handleBadgeClick(badge)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Badge Detail Modal */}
      <BadgeModal 
        badge={selectedBadge} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
});

export default BadgeCollection;