import { useNavigate } from 'react-router-dom';
import LottieAvatar from '../LottieAvatar';
import { safeStorage, ErrorCode, createAppError, getUserFriendlyErrorMessage } from '../../types/errors';
import * as Sentry from '@sentry/react';

// Import memoized components
@@ .. @@
  const loadUserPreferences = () => {
    // Load preferences from localStorage
    const savedNotifications = safeStorage.getItem('zensai-notifications', 'true');
    setNotifications(savedNotifications !== 'false'); // Default to true
  };

@@ .. @@
  const loadUserProfile = async () => {
    if (!user) return;

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'settings',
      message: 'Loading user profile',
      level: 'info'
    });
    
    console.log('Loading user profile for premium status check');
    try {
      setIsLoadingProfile(true);
@@ .. @@
      setProfile(profileData);
      console.log('loadUserData: Fetched profile:', profileData);
    } catch (err) {
      // Capture the error with additional context
      Sentry.captureException(err, {
        tags: {
          section: 'settings',
          operation: 'loadUserProfile'
        },
        extra: {
          userId: user.id
        }
      });
      
      const err = error as Error;
      
      // Log detailed error information for debugging
@@ .. @@
  const handleToggleNotifications = useCallback((enabled: boolean) => {
    setNotifications(enabled);
    safeStorage.setItem('zensai-notifications', enabled.toString());
    setSuccess(enabled ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setSuccess(''), 2000);
  }, []);