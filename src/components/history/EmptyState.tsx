import React from 'react';
import { motion } from 'framer-motion';
import LottieAvatar from '../LottieAvatar';
import { HISTORY } from '../../constants/uiStrings';

/**
 * EmptyState - Component displayed when no journal entries match the current filters
 * 
 * @component
 * @param {string} searchTerm - Current search term
 * @param {string} filterMood - Current mood filter
 * @param {function} onClearFilters - Function to clear all filters
 * 
 * @example
 * return (
 *   <EmptyState
 *     searchTerm="happiness"
 *     filterMood="all"
 *     onClearFilters={handleClearFilters}
 *   />
 * )
 */
interface EmptyStateProps {
  searchTerm: string;
  filterMood: string;
  onClearFilters: () => void;
}

const EmptyState = React.memo(function EmptyState({
  searchTerm,
  filterMood,
  onClearFilters
}: EmptyStateProps) {
  const hasFilters = searchTerm || filterMood !== 'all';

  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <LottieAvatar mood={3} size="lg" variant="idle" />
      <h3 className="text-xl font-display font-semibold text-zen-sage-800 dark:text-gray-200 mt-6 mb-2">
        {HISTORY.EMPTY_STATE.NO_ENTRIES}
      </h3>
      <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
        {hasFilters 
          ? HISTORY.EMPTY_STATE.WITH_FILTERS
          : HISTORY.EMPTY_STATE.NO_FILTERS
        }
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-6 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </motion.div>
  );
});

export default EmptyState;