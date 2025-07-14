import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

/**
 * ErrorMessage - Displays error messages in a consistent format
 * 
 * @component
 * @param {string} error - Error message to display
 * 
 * @example
 * return <ErrorMessage error="Failed to save journal entry" />
 */
interface ErrorMessageProps {
  error: string;
}

const ErrorMessage = React.memo(function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ErrorMessage;