/**
 * Network utility functions for handling API requests with retry logic
 */

/**
 * Retry configuration for network requests
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000   // 5 seconds
};

/**
 * Sleep utility for retry delays
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is retryable (network/timeout errors)
 */
export const isRetryableError = (error: any): boolean => {
  if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
    return true;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
    return true;
  }
  return false;
};

/**
 * Execute a function with retry logic
 * 
 * @param fn Function to retry
 * @param operation Description of the operation for logging
 * @param retries Maximum number of retry attempts
 * @returns Promise resolving to the function result
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  operation: string = 'operation',
  retries = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If it's a network error or Supabase is unreachable, don't retry
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt === retries) {
        break;
      }
      
      // Only retry for retryable errors
      if (!isRetryableError(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      console.warn(`${operation} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`, 
        error instanceof Error ? error.message : String(error));
      
      await sleep(delay);
    }
  }
  
  throw lastError;
};