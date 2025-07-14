import React from 'react';
import { AlertCircle } from 'lucide-react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  error?: string | null;
  onRetry?: () => void;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className = '',
  error = null, 
  onRetry 
}) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
        <p className="text-gray-600 mb-4 max-w-md">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} border-zen-mint-400 border-t-transparent rounded-full animate-spin ${className}`} 
      role="status" 
      aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;