import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Create mock for useJournal before importing usePremium
vi.mock('../../hooks/useJournal', () => ({
  useJournal: vi.fn(() => ({
    profile: { 
      subscription_status: 'free',
      subscription_tier: 'free'
    }
  }))
}));

// Create mock for safeStorage
vi.mock('../../types/errors', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    safeStorage: {
      getItem: vi.fn().mockImplementation((key, defaultValue) => defaultValue),
      setItem: vi.fn().mockReturnValue(true),
      removeItem: vi.fn().mockReturnValue(true)
    }
  };
});

// Mock AuthProvider
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true
  })),
  AuthProvider: ({ children }) => <>{children}</>
}));

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { 
              subscription_status: 'free',
              subscription_tier: 'free',
              created_at: new Date().toISOString()
            },
            error: null
          })
        }))
      }))
    }))
  }
}));

// Import after mocks are set up
import { usePremium } from '../../hooks/usePremium';
import { safeStorage } from '../../types/errors';
import { useAuth } from '../../contexts/AuthContext';
import { useJournal } from '../../hooks/useJournal';
import { supabase } from '../../lib/supabase';
import { AllTheProviders } from '../utils';

describe('usePremium', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should return isPremium as false for free users', async () => {
    // Set up the mock to return a free user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'free-user-id', name: 'Free User', email: 'free@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn()
    });

    // Mock the profile data
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              subscription_status: 'free',
              subscription_tier: 'free',
              created_at: new Date().toISOString()
            },
            error: null
          })
        })
      })
    } as any);

    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });
    
    // Wait for async operations to complete
    await act(async () => {
      // Just waiting for state updates
    });

    // Check result
    expect(result.current.isPremium).toBe(false);
  });

  it('should return isTrialActive as true for a user within 7 days of signup', async () => {
    // Mock a user profile with created_at within the trial period (e.g., 3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              subscription_status: 'free',
              subscription_tier: 'free',
              created_at: threeDaysAgo.toISOString()
            },
            error: null
          })
        })
      })
    } as any);

    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });

    await act(async () => {
      // Just waiting for state updates
    });

    // Assert the new reality
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isTrialActive).toBe(true);
  });

  it('should return isTrialActive as false for a user whose trial has expired', async () => {
    // Mock a user profile with created_at outside the trial period (e.g., 10 days ago)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              subscription_status: 'free',
              subscription_tier: 'free',
              created_at: tenDaysAgo.toISOString()
            },
            error: null
          })
        })
      })
    } as any);

    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });

    await act(async () => {
      // Just waiting for state updates
    });

    // Assert the new reality
    expect(result.current.isPremium).toBe(false);
    expect(result.current.isTrialActive).toBe(false);
  });

  it('should track feature usage for free users', async () => {
    // Set up the mock to return a free user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'free-user-id', name: 'Free User', email: 'free@example.com' },
      isAuthenticated: true
    } as any);

    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });
    
    // Wait for async operations to complete
    await act(async () => {
      // Just waiting for state updates
    });

    // Test feature usage tracking
    act(() => {
      const canUse = result.current.trackFeatureUsage('test-feature', 2);
      expect(canUse).toBe(true);
      expect(safeStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('test-feature'), '1');
    });
  });

  it('should show and hide upsell modal', async () => {
    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });
    
    // Wait for async operations to complete
    await act(async () => {
      // Just waiting for state updates
    });

    // Initially modal should be closed
    expect(result.current.isUpsellModalOpen).toBe(false);
    
    // Show modal
    act(() => {
      result.current.showUpsellModal({
        featureName: 'Test Feature',
        featureDescription: 'This is a test feature'
      });
    });
    
    // Modal should be open with correct content
    expect(result.current.isUpsellModalOpen).toBe(true);
    expect(result.current.upsellContent.featureName).toBe('Test Feature');
    expect(result.current.upsellContent.featureDescription).toBe('This is a test feature');
    
    // Hide modal
    act(() => {
      result.current.hideUpsellModal();
    });
    
    // Modal should be closed
    expect(result.current.isUpsellModalOpen).toBe(false);
  });
});

// Test with premium user
describe('usePremium with premium user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Override the mock for premium user tests
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'premium-user-id', name: 'Premium User', email: 'premium@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn()
    });

    // Mock the profile data for premium user
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { 
              subscription_status: 'premium',
              subscription_tier: 'premium_plus',
              created_at: new Date().toISOString()
            },
            error: null
          })
        })
      })
    } as any);
  });

  it('should return isPremium as true for premium users', async () => {
    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });
    
    // Wait for async operations to complete
    await act(async () => {
      // Just waiting for state updates
    });

    // Check result
    expect(result.current.isPremium).toBe(true);
  });

  it('should always allow feature usage for premium users', async () => {
    const { result } = renderHook(() => usePremium(), {
      wrapper: AllTheProviders
    });
    
    // Wait for async operations to complete
    await act(async () => {
      // Just waiting for state updates
    });

    // Test feature usage tracking for premium users
    act(() => {
      const canUse = result.current.trackFeatureUsage('test-feature', 2);
      expect(canUse).toBe(true);
      // Should not increment usage counter for premium users
      expect(safeStorage.setItem).not.toHaveBeenCalled();
    });
  });
});