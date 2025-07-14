import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * TestErrorButton - A component to test Sentry error reporting
 * 
 * @component
 * @example
 * return <TestErrorButton />
 */
const TestErrorButton: React.FC = () => {
  const handleTestError = () => {
    try {
      // Intentionally throw an error for testing
      throw new Error("This is a test error for Sentry!");
    } catch (error) {
      Sentry.captureException(error);
      alert("Test error sent to Sentry!");
    }
  };

  const handleTestCrash = () => {
    // This will crash the component and be caught by the ErrorBoundary
    throw new Error("Test crash for Sentry ErrorBoundary!");
  };

  return (
    <div className="flex flex-col space-y-2 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md">
      <h3 className="text-sm font-medium text-zen-sage-700 dark:text-gray-300">Sentry Test Tools</h3>
      <div className="flex space-x-2">
        <button
          onClick={handleTestError}
          className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          Test Error Capture
        </button>
        <button
          onClick={handleTestCrash}
          className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Test Error Boundary
        </button>
      </div>
      <p className="text-xs text-zen-sage-500 dark:text-gray-400">
        For development only. Remove in production.
      </p>
    </div>
  );
};

export default TestErrorButton;