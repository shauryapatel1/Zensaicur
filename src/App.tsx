import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'; 
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useEffect } from 'react';
import { useStripe } from './hooks/useStripe';
import Footer from './components/Footer';
import ErrorFallback from './components/ErrorFallback';
import AuthenticatedApp from './components/AuthenticatedApp';
import { ZenoProvider } from './contexts/ZenoContext';

// Lazy load components
const AuthScreen = React.lazy(() => import('./components/AuthScreen'));
const LandingPage = React.lazy(() => import('./components/LandingPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage')); 
const TermsPage = React.lazy(() => import('./pages/TermsPage'));

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleSubscriptionSuccess } = useStripe();
  
  // Handle subscription success redirect
  useEffect(() => {
    const handleStripeRedirect = async () => {
      // Check if this is a redirect from Stripe checkout
      const query = new URLSearchParams(location.search);
      const subscriptionStatus = query.get('subscription');
      const sessionId = query.get('session_id');
      
      if (subscriptionStatus === 'success' && sessionId && isAuthenticated) {
        // Verify the subscription was successful
        const success = await handleSubscriptionSuccess(sessionId);
        
        if (success) {
          // Redirect to home with success message
          navigate('/home?subscription_activated=true', { replace: true });
        } else {
          // Redirect to premium page with error
          navigate('/premium?subscription_error=true', { replace: true });
        }
      }
    };
    
    if (isAuthenticated && !isLoading) {
      handleStripeRedirect();
    }
  }, [location, isAuthenticated, isLoading, handleSubscriptionSuccess, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading Zensai...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route 
            path="/landing" 
            element={
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <LandingPage />
              </motion.div>
            } 
          />
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.5 }}
                >
                  <AuthScreen />
                </motion.div>
              )
            } 
          />
          <Route 
            path="/home" 
            element={
              isAuthenticated ? (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                >
                  <AuthenticatedApp />
                </motion.div>
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
          <Route 
            path="/privacy" 
            element={
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <PrivacyPage />
              </motion.div>
            } 
          />
          <Route 
            path="/terms" 
            element={
              <motion.div
                key="terms"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <TermsPage />
              </motion.div>
            } 
          />
          <Route 
            path="/" 
            element={
              <Navigate to={isAuthenticated ? "/home" : "/landing"} replace />
            } 
          />
        </Routes>
        <Footer />
      </Suspense>
    </AnimatePresence>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading Zensai...</p>
      </motion.div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Sentry.ErrorBoundary 
            fallback={({ error, resetError, componentStack, eventId }) => (
              <ErrorFallback 
                error={error}
                resetError={resetError}
                componentStack={componentStack}
                eventId={eventId}
              />
            )}
            showDialog
          >
            <ZenoProvider>
                <AppContent />
            </ZenoProvider>
          </Sentry.ErrorBoundary>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;