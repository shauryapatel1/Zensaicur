import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${supabaseUrl}/functions/v1`;

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your_anon_key_here' &&
  supabaseUrl !== 'your_supabase_url_here';

// Debug logging for development
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key exists:', !!supabaseAnonKey);
  console.log('Has valid credentials:', hasValidCredentials);
  console.log('Supabase Functions URL:', SUPABASE_FUNCTIONS_URL);
}

if (!hasValidCredentials) {
  console.warn('Missing or invalid Supabase environment variables:');
  console.warn('VITE_SUPABASE_URL:', supabaseUrl);
  console.warn('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey === 'your_anon_key_here' ? 'Using placeholder value' : (!!supabaseAnonKey ? 'Set' : 'Missing'));
  console.warn('Please connect to Supabase by clicking the "Connect to Supabase" button in the top right.');
}

// Validate URL format only if we have a real URL
if (hasValidCredentials && supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    
    // Ensure the URL uses HTTPS protocol (except for localhost)
    if (!url.hostname.includes('localhost') && url.protocol !== 'https:') {
      console.error('Supabase URL must use HTTPS protocol:', supabaseUrl);
      throw new Error('Supabase URL must use HTTPS protocol. Please check your VITE_SUPABASE_URL in .env file.');
    }
  } catch (error) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
  }
}

export const supabase = hasValidCredentials ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}) : null;

// Enhanced connection retry utility with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors or client errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }
      
      // Don't retry on network errors that indicate permanent issues
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message.toLowerCase();
        if (message.includes('cors') || message.includes('blocked')) {
          throw error;
        }
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Retrying operation (attempt ${attempt + 2}/${maxRetries + 1}) after ${Math.round(delay)}ms delay`);
    }
  }
  
  throw lastError;
};

// Enhanced Edge Function invocation with better error handling
export const invokeEdgeFunction = async (
  functionName: string,
  payload: any,
  options: { timeout?: number; retries?: number } = {}
) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please connect to Supabase first.');
  }

  const { timeout = 30000, retries = 3 } = options;
  
  return withRetry(async () => {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error(`Edge function ${functionName} error:`, error);
        throw new Error(`Edge function failed: ${error.message || 'Unknown error'}`);
      }
      
      return { data, error: null };
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Edge function ${functionName} timed out after ${timeout}ms`);
      }
      
      throw err;
    }
  }, retries);
};

// Connection health check utility
export const checkSupabaseConnection = async (): Promise<{ 
  isConnected: boolean; 
  error?: string; 
  details?: any 
}> => {
  try {
    if (!supabase) {
      return { 
        isConnected: false, 
        error: 'Supabase client not initialized. Please connect to Supabase by clicking the "Connect to Supabase" button.'
      };
    }
    
    if (!hasValidCredentials) {
      return {
        isConnected: false,
        error: 'Invalid Supabase credentials. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly set.'
      };
    }
    
    // Test basic connectivity with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(0);
    
    if (error) {
      // RLS error is actually a good sign - it means we're connected
      if (error.code === 'PGRST116') {
        return { isConnected: true };
      }
      return { 
        isConnected: false, 
        error: error.message,
        details: error 
      };
    }
    
    return { isConnected: true };
  } catch (error: any) {
    return { 
      isConnected: false, 
      error: error.message || 'Unknown connection error',
      details: error 
    };
  }
};

// Test Supabase connection on startup in development
if (import.meta.env.DEV) {
  // Delay the connection test to avoid blocking app startup
  setTimeout(async () => {
    try {
      if (!supabase) {
        console.log('🔍 Supabase client not initialized. Please connect to Supabase by clicking the "Connect to Supabase" button.');
        return;
      }
      
      if (!hasValidCredentials) {
        console.log('🔍 Invalid Supabase credentials detected. Please check your .env file.');
        return;
      }
      
      console.log('🔍 Testing Supabase connection...');
      
      const connectionResult = await checkSupabaseConnection();
      
      if (connectionResult.isConnected) {
        console.log('✅ Supabase connection successful');
      } else {
        console.error('❌ Supabase connection failed:', connectionResult.error);
      }
    } catch (error: any) {
      console.warn('⚠️ Connection test failed:', error.message);
    }
  }, 1000);
}