import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../types/errors';

interface User {
  id: string;
  name: string;
  email: string;
  joinedDate: Date;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if Supabase is connected
        if (!supabase) {
          console.warn('Supabase not connected. Please connect to Supabase first.');
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Get user session with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const sessionPromise = supabase.auth.getUser();
        const { data: { user }, error } = await Promise.race([
          sessionPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          )
        ]) as any;
        
        clearTimeout(timeoutId);
        
        if (error) {
          // Handle different types of auth errors gracefully
          if (error.message?.includes('Auth session missing')) {
            console.log('No active session found - user is not authenticated');
          } else if (error.message?.includes('Invalid Refresh Token')) {
            console.log('Invalid refresh token found - clearing session');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn('Error during sign out:', signOutError);
            }
          } else {
            console.warn('Auth error during initialization:', error.message);
          }
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (user) {
          const userData = mapSupabaseUserToUser(user);
          setAuthState({
            user: userData,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.warn('Failed to get initial session:', error);
        
        // Handle different types of errors gracefully
        if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
          console.warn('Network connectivity issue detected. App will continue in offline mode.');
          console.warn('Please check:');
          console.warn('- Internet connection');
          console.warn('- Supabase configuration');
          console.warn('- Firewall/VPN settings');
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('Authentication request timed out. App will continue without authentication.');
        } else if (error instanceof Error && error.message === 'Request timeout') {
          console.warn('Authentication request timed out. App will continue without authentication.');
        } else {
          console.warn('Unexpected error during authentication initialization:', error);
        }
        
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    if (!supabase) {
      return;
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = mapSupabaseUserToUser(session.user);
          setAuthState({
            user: userData,
            isAuthenticated: true,
            isLoading: false
          });
          
          // Set user context in Sentry when user signs in
          Sentry.setUser({
            id: userData.id,
            email: userData.email,
            username: userData.name
          });
          
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
          
          // Clear user context in Sentry when user signs out
          Sentry.setUser(null);
        }
      } catch (error) {
        console.warn('Error handling auth state change:', error);
        // Ensure loading state is cleared even on error
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      joinedDate: new Date(supabaseUser.created_at)
    };
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Add timeout to login request
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      const { data, error } = await Promise.race([
        loginPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Login request timeout')), 10000)
        )
      ]) as any;
      
      if (error) {
        let errorMessage = 'Login failed. Please try again.';
        let errorCode = ErrorCode.UNKNOWN_ERROR;
        
        if (error.message?.includes('Invalid login credentials') || 
            error.message?.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
          errorCode = ErrorCode.AUTH_INVALID_CREDENTIALS;
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
          errorCode = ErrorCode.AUTH_USER_NOT_FOUND;
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
          errorCode = ErrorCode.AUTH_TOO_MANY_REQUESTS;
        } else if (error.message?.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          errorCode = ErrorCode.UNKNOWN_ERROR;
        }
        
        const appError = createAppError(errorCode, errorMessage, { originalMessage: error.message });
        return { success: false, error: getUserFriendlyErrorMessage(appError) };
      }

      if (data.user) {
        // User state will be updated by the auth state change listener
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error) {
      console.warn('Login error:', getUserFriendlyErrorMessage(createAppError(ErrorCode.UNKNOWN_ERROR, 'Login failed', undefined, error)));
      
      // Handle specific error types
      if (error instanceof Error && error.message === 'Login request timeout') {
        return { success: false, error: 'Login request timed out. Please check your internet connection and try again.' };
      } else if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
        return { success: false, error: 'Network error. Please check your internet connection and try again.' };
      }
      
      return { success: false, error: getUserFriendlyErrorMessage(createAppError(ErrorCode.UNKNOWN_ERROR, 'An unexpected error occurred. Please try again.', undefined, error)) };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Add timeout to signup request
      const signupPromise = supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim()
          },
          emailRedirectTo: window.location.origin + '/auth'
        }
      });
      
      const { data, error } = await Promise.race([
        signupPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Signup request timeout')), 10000)
        )
      ]) as any;
      
      if (error) {
        let errorMessage = 'Sign up failed. Please try again.';
        let errorCode = ErrorCode.UNKNOWN_ERROR;
        
        if (error.message?.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
          errorCode = ErrorCode.AUTH_EMAIL_IN_USE;
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
          errorCode = ErrorCode.AUTH_WEAK_PASSWORD;
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
          errorCode = ErrorCode.AUTH_INVALID_EMAIL;
        } else if (error.message?.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
          errorCode = ErrorCode.UNKNOWN_ERROR;
        }
        
        const appError = createAppError(errorCode, errorMessage, { originalMessage: error.message });
        return { success: false, error: getUserFriendlyErrorMessage(appError) };
      }

      if (data.user) {
        // Check if email confirmation is required
        if (!data.session) {
          return { 
            success: true, 
            error: 'Please check your email and click the confirmation link to complete your registration.'
          };
        }
        
        // User state will be updated by the auth state change listener
        return { success: true };
      }

      return { success: false, error: 'Sign up failed. Please try again.' };
    } catch (error) {
      console.warn('Signup error:', error);
      
      // Handle specific error types
      if (error instanceof Error && error.message === 'Signup request timeout') {
        return { success: false, error: 'Signup request timed out. Please check your internet connection and try again.' };
      } else if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
        return { success: false, error: 'Network error. Please check your internet connection and try again.' };
      }
      
      return { success: false, error: getUserFriendlyErrorMessage(createAppError(ErrorCode.UNKNOWN_ERROR, 'An unexpected error occurred. Please try again.', undefined, error)) };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Logout error:', error);
      }
      // User state will be updated by the auth state change listener
    } catch (error) {
      console.warn('Logout error:', error);
      // Even if logout fails, clear the local state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      signup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}