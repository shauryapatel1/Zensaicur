import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { usePremium } from '../hooks/usePremium';
import { safeStorage } from '../types/errors';
import UpsellModal from './UpsellModal';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';

// Import memoized components
import ProfileOverviewCard from './settings/ProfileOverviewCard';
import ProfileSettingsForm from './settings/ProfileSettingsForm';
import AppPreferencesSection from './settings/AppPreferencesSection';
import SubscriptionSection from './settings/SubscriptionSection';
import DataPrivacySection from './settings/DataPrivacySection';
import AccountActionsSection from './settings/AccountActionsSection';
import { LogoutConfirmModal, DeleteAccountModal } from './settings/ConfirmationModals';

// Import notification components
import { motion as framerMotion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

interface UserProfile {
  user_id: string;
  name: string;
  current_streak: number;
  best_streak: number;
  last_entry_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isPremium, isUpsellModalOpen, upsellContent, showUpsellModal, hideUpsellModal, isTrialActive } = usePremium();
  const { isDarkMode, setDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [journalingGoal, setJournalingGoal] = useState(3);
  const [originalGoal, setOriginalGoal] = useState(3);
  
  // Preferences state
  const [notifications, setNotifications] = useState(true);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load user profile and preferences
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserPreferences();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile data');
        return;
      }

      setProfile(profileData);
      setDisplayName(profileData.name || user.name || '');
      setOriginalName(profileData.name || user.name || '');
      setJournalingGoal(profileData.journaling_goal_frequency || 3);
      setOriginalGoal(profileData.journaling_goal_frequency || 3);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPreferences = () => {
    // Load preferences from localStorage
    try {
      const savedNotifications = safeStorage.getItem('zensai-notifications', 'true');
      setNotifications(savedNotifications !== 'false'); // Default to true
    } catch (err) {
      console.error('Error loading preferences:', err);
      // Default to enabled if localStorage fails
      setNotifications(true);
    }
  };

  const handleSaveProfile = useCallback(async () => {
    if (!user || !profile) return;

    if (displayName.trim() === originalName && journalingGoal === originalGoal) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (displayName.trim() !== originalName) {
        updateData.name = displayName.trim();
      }

      if (journalingGoal !== originalGoal) {
        updateData.journaling_goal_frequency = journalingGoal;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        setError('Failed to update profile. Please try again.');
        return;
      }

      setOriginalName(displayName.trim());
      setOriginalGoal(journalingGoal);
      setProfile(prev => prev ? { 
        ...prev, 
        name: displayName.trim(),
        journaling_goal_frequency: journalingGoal
      } : null);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user, profile, displayName, originalName, journalingGoal, originalGoal]);

  const handleToggleDarkMode = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    setSuccess(enabled ? 'Dark mode enabled' : 'Light mode enabled');
    setTimeout(() => setSuccess(''), 2000);
  }, [setDarkMode]);

  const handleToggleNotifications = useCallback((enabled: boolean) => {
    setNotifications(enabled);
    try {
      safeStorage.setItem('zensai-notifications', enabled.toString());
    } catch (err) {
      console.error('Error saving notification preference:', err);
    }
    setSuccess(enabled ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setSuccess(''), 2000);
  }, []);

  const handleExportData = useCallback(async () => {
    if (!user) return;

    try {
      setIsExporting(true);
      setError('');

      const { data, error: functionError } = await supabase.functions.invoke('export-journal-data', {
        body: { user_id: user.id }
      });

      if (functionError) {
        console.error('Export function error:', functionError);
        setError('Failed to export data. Please try again.');
        return;
      }

      if (!data.success) {
        setError(data.error || 'Failed to export data');
        return;
      }

      // Create and download the file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zensai-journal-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Journal data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('An unexpected error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to sign out. Please try again.');
    }
  }, [logout]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion');
      return;
    }

    try {
      setError('');
      
      const { data, error: functionError } = await supabase.functions.invoke('delete-user-data', {
        body: { user_id: user?.id }
      });

      if (functionError) {
        console.error('Delete function error:', functionError);
        setError('Failed to delete account. Please try again.');
        return;
      }

      if (!data.success) {
        setError(data.error || 'Failed to delete account');
        return;
      }

      setSuccess('Account deleted successfully. You will be signed out.');
      setTimeout(async () => {
        await logout();
      }, 2000);
      
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Failed to delete account. Please try again.');
    }
  }, [deleteConfirmText, user?.id, logout]);

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-zen-mint-200 rounded-full opacity-20"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-zen-lavender-200 rounded-full opacity-20"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            
            {/* Logo with Zeno */}
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2 text-zen-mint-500" aria-hidden="true" />
                Settings
              </h1>
              <p className="text-xs text-zen-sage-600 dark:text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <framerMotion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">{success}</span>
            </div>
          </framerMotion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <framerMotion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-red-400 to-red-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-red-300 max-w-sm"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-sm">Error</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Dismiss error message"
              >
                ×
              </button>
            </div>
          </framerMotion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ProfileOverviewCard
              name={profile?.name || user?.name || 'User'}
              email={user?.email || ''}
              joinedDate={formatJoinDate(user?.joinedDate?.toISOString() || profile?.created_at || '')}
              currentStreak={profile?.current_streak}
              bestStreak={profile?.best_streak}
              totalBadgesEarned={profile?.total_badges_earned}
            />
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Profile Settings */}
            <ProfileSettingsForm
              displayName={displayName}
              originalName={originalName}
              journalingGoal={journalingGoal}
              originalGoal={originalGoal}
              userEmail={user?.email || ''}
              isSaving={isSaving}
              onSave={handleSaveProfile}
            />

            {/* App Preferences */}
            <AppPreferencesSection
              isDarkMode={isDarkMode}
              notifications={notifications}
              onToggleDarkMode={handleToggleDarkMode}
              onToggleNotifications={handleToggleNotifications}
            />

            {/* Subscription Section */}
            <SubscriptionSection
              subscriptionStatus={profile?.subscription_status || 'free'}
              subscriptionTier={profile?.subscription_tier || 'free'}
              subscriptionExpiresAt={profile?.subscription_expires_at} 
              isTrialActive={isTrialActive}
              profileCreatedAt={profile?.created_at}
            />

            {/* Data & Privacy Section */}
            <DataPrivacySection
              isExporting={isExporting}
              onExportData={handleExportData}
            />

            {/* Account Actions */}
            <AccountActionsSection
              onShowLogoutConfirm={() => setShowLogoutConfirm(true)}
              onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
            />
          </motion.div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        onConfirm={handleDeleteAccount}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        isConfirmDisabled={deleteConfirmText !== 'DELETE'}
      />

      {/* Upsell Modal */}
      <UpsellModal
        isOpen={isUpsellModalOpen}
        onClose={hideUpsellModal}
        featureName={upsellContent?.featureName || 'Premium Feature'}
        featureDescription={upsellContent?.featureDescription || 'Upgrade to unlock premium features'}
      />
    </div>
  );
}