/**
 * Standard error types for the application
 */

/**
 * Base application error interface
 * @interface AppError
 */
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  originalError?: unknown;
}

/**
 * Error codes for the application
 */
export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'auth/invalid-credentials',
  AUTH_EMAIL_IN_USE = 'auth/email-in-use',
  AUTH_WEAK_PASSWORD = 'auth/weak-password',
  AUTH_INVALID_EMAIL = 'auth/invalid-email',
  AUTH_USER_NOT_FOUND = 'auth/user-not-found',
  AUTH_TOO_MANY_REQUESTS = 'auth/too-many-requests',
  
  // Journal errors
  JOURNAL_ENTRY_EMPTY = 'journal/entry-empty',
  JOURNAL_ENTRY_TOO_LONG = 'journal/entry-too-long',
  JOURNAL_SAVE_FAILED = 'journal/save-failed',
  JOURNAL_UPDATE_FAILED = 'journal/update-failed',
  JOURNAL_DELETE_FAILED = 'journal/delete-failed',
  JOURNAL_LOAD_FAILED = 'journal/load-failed',
  
  // Premium feature errors
  PREMIUM_REQUIRED = 'premium/feature-required',
  PREMIUM_DAILY_LIMIT = 'premium/daily-limit-reached',
  
  // Media errors
  MEDIA_UPLOAD_FAILED = 'media/upload-failed',
  MEDIA_INVALID_TYPE = 'media/invalid-type',
  MEDIA_TOO_LARGE = 'media/too-large',
  
  // AI service errors
  AI_SERVICE_UNAVAILABLE = 'ai/service-unavailable',
  AI_GENERATION_FAILED = 'ai/generation-failed',
  
  // Storage errors
  STORAGE_READ_FAILED = 'storage/read-failed',
  STORAGE_WRITE_FAILED = 'storage/write-failed',
  
  // Network errors
  NETWORK_OFFLINE = 'network/offline',
  NETWORK_REQUEST_FAILED = 'network/request-failed',
  NETWORK_ERROR = 'network/error',
  
  // Generic errors
  UNKNOWN_ERROR = 'unknown/error',
  NOT_AUTHENTICATED = 'auth/not-authenticated',
  VALIDATION_ERROR = 'validation/error'
}

/**
 * Create a standardized application error
 * 
 * @param {string} code - Error code from ErrorCode enum
 * @param {string} message - Human-readable error message
 * @param {Record<string, any>} [details] - Additional error details
 * @param {unknown} [originalError] - Original error object if available
 * @returns {AppError} Standardized error object
 */
export function createAppError(
  code: string,
  message: string,
  details?: Record<string, any>,
  originalError?: unknown
): AppError {
  return {
    code,
    message,
    details,
    originalError
  };
}

/**
 * Get a user-friendly error message from an error object
 * 
 * @param {unknown} error - Error object
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  // If it's our AppError type
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const appError = error as AppError;
    return appError.message;
  }
  
  // If it's a standard Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // If it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'An unexpected error occurred';
}

/**
 * Safe localStorage wrapper to handle exceptions
 */
export const safeStorage = {
  /**
   * Get item from localStorage with error handling
   * 
   * @param {string} key - Storage key  
   * @param {T} defaultValue - Default value if key doesn't exist or error occurs
   * @returns {T} Stored value or default value
   */
  getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return defaultValue;
    }
  },
  
  /**
   * Set item in localStorage with error handling
   * 
   * @param {string} key - Storage key
   * @param {string|number|boolean|object} value - Value to store
   * @returns {boolean} Success status
   */
  setItem(key: string, value: string|number|boolean|object): boolean {
    try {
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      localStorage.setItem(key, valueToStore);
      return true;
    } catch (err) {
      console.error('Error writing to localStorage:', err);
      return false;
    }
  },
  
  /**
   * Remove item from localStorage with error handling
   * 
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error('Error removing from localStorage:', err);
      return false;
    }
  }
};