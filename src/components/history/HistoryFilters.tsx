import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { MoodLevel } from '../../types';
import MoodSelector from '../MoodSelector';
import { HISTORY } from '../../constants/uiStrings';

/**
 * HistoryFilters - Component for filtering and searching journal entries
 * 
 * @component
 * @param {string} searchTerm - Current search term
 * @param {function} onSearchChange - Function to update search term
 * @param {MoodLevel|'all'} filterMood - Current mood filter
 * @param {function} onFilterMoodChange - Function to update mood filter
 * @param {'newest'|'oldest'} sortOrder - Current sort order
 * @param {function} onSortOrderChange - Function to update sort order
 * @param {function} onClearFilters - Function to clear all filters
 * 
 * @example
 * return (
 *   <HistoryFilters
 *     searchTerm={searchTerm}
 *     onSearchChange={setSearchTerm}
 *     filterMood={filterMood}
 *     onFilterMoodChange={setFilterMood}
 *     sortOrder={sortOrder}
 *     onSortOrderChange={setSortOrder}
 *     onClearFilters={clearFilters}
 *   />
 * )
 */
interface HistoryFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterMood: MoodLevel | 'all';
  onFilterMoodChange: (mood: MoodLevel | 'all') => void;
  sortOrder: 'newest' | 'oldest';
  onSortOrderChange: (order: 'newest' | 'oldest') => void;
  onClearFilters: () => void;
}

const HistoryFilters = React.memo(function HistoryFilters({
  searchTerm,
  onSearchChange,
  filterMood,
  onFilterMoodChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters
}: HistoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  
  const hasActiveFilters = searchTerm || filterMood !== 'all';

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400 dark:text-gray-500" aria-hidden="true" />
          <input
            type="text"
            placeholder={HISTORY.SEARCH_PLACEHOLDER}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-400"
            aria-label="Search journal entries"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
            <span className="font-medium">{HISTORY.FILTERS.TITLE}</span>
            {showFilters ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-zen-mint-600 hover:text-zen-mint-700 font-medium"
              aria-label="Clear all filters"
            >
              {HISTORY.FILTERS.CLEAR}
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              id="filter-panel"
              className="mt-4 pt-4 border-t border-zen-sage-200 dark:border-gray-600"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mood Filter */}
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" id="mood-filter-label">
                    Filter by mood
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onFilterMoodChange('all')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        filterMood === 'all'
                          ? 'bg-zen-mint-400 text-white'
                          : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                      }`}
                      aria-pressed={filterMood === 'all'}
                      aria-labelledby="mood-filter-label"
                    >
                      {HISTORY.FILTERS.ALL_MOODS}
                    </button>
                    <div className="hidden sm:block">
                      <MoodSelector
                        selectedMood={filterMood === 'all' ? undefined : filterMood}
                        onMoodSelect={(mood) => onFilterMoodChange(mood)}
                        size="sm"
                        layout="horizontal"
                        showLabels={false}
                        aria-labelledby="mood-filter-label"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" id="sort-order-label">
                    Sort order
                  </label>
                  <div className="flex space-x-2" role="radiogroup" aria-labelledby="sort-order-label">
                    <button
                      onClick={() => onSortOrderChange('newest')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        sortOrder === 'newest'
                          ? 'bg-zen-mint-400 text-white'
                          : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                      }`}
                      role="radio"
                      aria-checked={sortOrder === 'newest'}
                    >
                      {HISTORY.FILTERS.NEWEST}
                    </button>
                    <button
                      onClick={() => onSortOrderChange('oldest')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        sortOrder === 'oldest'
                          ? 'bg-zen-mint-400 text-white'
                          : 'bg-zen-sage-100 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-300 hover:bg-zen-sage-200 dark:hover:bg-gray-500'
                      }`}
                      role="radio"
                      aria-checked={sortOrder === 'oldest'}
                    >
                      {HISTORY.FILTERS.OLDEST}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default HistoryFilters;