import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage, safeStorage } from '../../types/errors';

// Create a mock localStorage for testing
const createMockStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
};

describe('Error utilities', () => {
  describe('createAppError', () => {
    it('creates an error object with the correct structure', () => {
      const error = createAppError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { field: 'email' },
        new Error('Invalid email')
      );
      
      expect(error).toEqual({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'email' },
        originalError: new Error('Invalid email')
      });
    });
    
    it('creates an error with minimal properties', () => {
      const error = createAppError(
        ErrorCode.UNKNOWN_ERROR,
        'Something went wrong'
      );
      
      expect(error).toEqual({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Something went wrong',
        details: undefined,
        originalError: undefined
      });
    });
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    it('extracts message from AppError', () => {
      const error = createAppError(
        ErrorCode.VALIDATION_ERROR,
        'Please enter a valid email address'
      );
      
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Please enter a valid email address');
    });
    
    it('extracts message from Error object', () => {
      const error = new Error('Network request failed');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Network request failed');
    });
    
    it('handles string errors', () => {
      const message = getUserFriendlyErrorMessage('Something went wrong');
      expect(message).toBe('Something went wrong');
    });
    
    it('handles null or undefined', () => {
      expect(getUserFriendlyErrorMessage(null)).toBe('An unknown error occurred');
      expect(getUserFriendlyErrorMessage(undefined)).toBe('An unknown error occurred');
    });
    
    it('handles other types', () => {
      expect(getUserFriendlyErrorMessage(123)).toBe('An unexpected error occurred');
      expect(getUserFriendlyErrorMessage({})).toBe('An unexpected error occurred');
    });
  });
});

describe('safeStorage', () => {
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // Mock console.error to suppress expected error logs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a fresh mock storage for each test
    const mockStorage = createMockStorage();
    
    // Replace the global localStorage with our mock
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });
  });
  
  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
  
  describe('getItem', () => {
    it('retrieves string values correctly', () => {
      // Setup
      window.localStorage.setItem('test-key', 'test-value');
      
      // Test
      const result = safeStorage.getItem('test-key', 'default');
      
      // Verify
      expect(result).toBe('test-value');
      expect(window.localStorage.getItem).toHaveBeenCalledWith('test-key');
    });
    
    it('parses JSON values correctly', () => {
      // Setup
      window.localStorage.setItem('test-object', JSON.stringify({ foo: 'bar' }));
      
      // Test
      const result = safeStorage.getItem('test-object', {});
      
      // Verify
      expect(result).toEqual({ foo: 'bar' });
    });
    
    it('returns default value for missing keys', () => {
      // Test
      const result = safeStorage.getItem('missing-key', 'default-value');
      
      // Verify
      expect(result).toBe('default-value');
    });
    
    it('handles localStorage errors', () => {
      // Mock localStorage.getItem to throw an error
      window.localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Test
      const result = safeStorage.getItem('test-key', 'fallback');
      
      // Verify
      expect(result).toBe('fallback');
    });
  });
  
  describe('setItem', () => {
    it('stores string values correctly', () => {
      // Test
      const result = safeStorage.setItem('test-key', 'test-value');
      
      // Verify
      expect(result).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
      
      // Verify the value was actually stored
      expect(window.localStorage.getItem('test-key')).toBe('test-value');
    });
    
    it('stores and stringifies objects correctly', () => {
      // Setup
      const testObject = { foo: 'bar', num: 123 };
      
      // Test
      const result = safeStorage.setItem('test-object', testObject);
      
      // Verify
      expect(result).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('test-object', JSON.stringify(testObject));
      
      // Verify the value was stored correctly
      const storedValue = window.localStorage.getItem('test-object');
      expect(JSON.parse(storedValue || '{}')).toEqual(testObject);
    });
    
    it('handles localStorage errors', () => {
      // Mock localStorage.setItem to throw an error
      window.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Test
      const result = safeStorage.setItem('test-key', 'test-value');
      
      // Verify
      expect(result).toBe(false);
    });
  });
  
  describe('removeItem', () => {
    it('removes items correctly', () => {
      // Set up an item
      window.localStorage.setItem('test-key', 'test-value');
      
      // Test
      const result = safeStorage.removeItem('test-key');
      
      // Verify
      expect(result).toBe(true);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('test-key');
      
      // Verify the item was actually removed
      expect(window.localStorage.getItem('test-key')).toBeNull();
    });
    
    it('handles localStorage errors', () => {
      // Mock localStorage.removeItem to throw an error
      window.localStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Test
      const result = safeStorage.removeItem('test-key');
      
      // Verify
      expect(result).toBe(false);
    });
  });
});