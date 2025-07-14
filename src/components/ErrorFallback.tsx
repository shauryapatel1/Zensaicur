import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/react';
import Logo from './Logo';

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  componentStack?: string;
  eventId?: string;
}

/**
 * ErrorFallback - A component to display when an error occurs
 * 
 * @component
 * @param {Error} error - The error that was caught
 * @param {function} [resetError] - Function to reset the error state
 * @param {string} [componentStack] - React component stack trace
 * @param {string} [eventId] - Sentry event ID
 * 
 * @example
 * return (
 *   <ErrorFallback 
 *     error={error}
 *     resetError={resetError}
 *     componentStack={componentStack}
 *     eventId={eventId}
 *   />
 * )
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError,
  componentStack,
  eventId
}) => {
  const handleReportFeedback = () => {
    if (eventId) {
      Sentry.showReportDialog({ eventId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20 max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200">
              Something went wrong
            </h2>
            <p className="text-zen-sage-600 dark:text-gray-400">
              We've been notified about this issue and are working to fix it.
            </p>
          </div>
        </div>
        
        <div className="bg-zen-sage-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
          <p className="text-zen-sage-700 dark:text-gray-300 text-sm font-mono overflow-auto max-h-32">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>
        
        <div className="flex flex-col space-y-3">
          {resetError && (
            <button
              onClick={resetError}
              className="w-full py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300"
            >
              Try again
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-700 dark:text-gray-300 font-medium rounded-xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-all duration-300"
          >
            Refresh the page
          </button>
          
          {eventId && (
            <button
              onClick={handleReportFeedback}
              className="w-full py-3 border border-zen-sage-300 dark:border-gray-600 text-zen-sage-600 dark:text-gray-400 font-medium rounded-xl hover:bg-zen-sage-50 dark:hover:bg-gray-700 transition-all duration-300"
            >
              Report feedback
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ErrorFallback;