import React from 'react';
import { motion } from 'framer-motion';

/**
 * HistoryPagination - Pagination component for journal history
 * 
 * @component
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Function to handle page changes
 * 
 * @example
 * return (
 *   <HistoryPagination
 *     currentPage={2}
 *     totalPages={5}
 *     onPageChange={setCurrentPage}
 *   />
 * )
 */
interface HistoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const HistoryPagination = React.memo(function HistoryPagination({
  currentPage,
  totalPages,
  onPageChange
}: HistoryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <motion.div
      className="mt-12 flex justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to previous page"
        >
          Previous
        </button>
        
        <div className="flex space-x-1" role="group">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-zen-mint-400 text-white'
                  : 'text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-zen-sage-100 dark:hover:bg-gray-700'
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
});

export default HistoryPagination;