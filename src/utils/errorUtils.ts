import * as Sentry from '@sentry/react';

/**
 * A robust utility to extract a user-friendly message from any error type.
 * @param error - The value caught in a catch block.
 * @returns A string representing the error message.
 */
export const getErrorMessage = (error: unknown): string => {
  // Capture the error in Sentry
  Sentry.captureException(error);
  
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  // Check for Supabase-like error objects
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred. Please try again.';
};