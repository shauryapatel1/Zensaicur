import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * ProfileSettingsForm - Form for editing user profile information
 * 
 * @component
 * @param {string} displayName - Current display name
 * @param {string} originalName - Original display name for comparison
 * @param {number} journalingGoal - Current journaling goal frequency
 * @param {number} originalGoal - Original journaling goal for comparison
 * @param {string} userEmail - User's email address
 * @param {boolean} isSaving - Whether the form is currently saving
 * @param {function} onSave - Function to call when saving changes
 * 
 * @example
 * return (
 *   <ProfileSettingsForm
 *     displayName="John Doe"
 *     originalName="John Doe"
 *     journalingGoal={3}
 *     originalGoal={3}
 *     isSaving={false}
 *     onSave={handleSaveProfile}
 *   />
 * )
 */
interface ProfileSettingsFormProps {
  displayName: string;
  originalName: string;
  journalingGoal: number;
  originalGoal: number;
  userEmail: string;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

const ProfileSettingsForm = React.memo(function ProfileSettingsForm({
  displayName,
  originalName,
  journalingGoal,
  originalGoal,
  userEmail,
  isSaving,
  onSave
}: ProfileSettingsFormProps) {
  const [name, setName] = useState(displayName);
  const [goal, setGoal] = useState(journalingGoal);
  
  const hasUnsavedChanges = name.trim() !== originalName || goal !== originalGoal;

  const handleSave = async () => {
    // Update parent state
    if (name !== displayName) {
      displayName = name;
    }
    if (goal !== journalingGoal) {
      journalingGoal = goal;
    }
    
    // Call parent save function
    await onSave();
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
      <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
        {SETTINGS.PROFILE.TITLE}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="display-name">
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
            placeholder="Enter your display name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="email-address">
            Email Address
          </label>
          <input
            id="email-address"
            type="email"
            value={userEmail}
            disabled
            className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl bg-zen-sage-50 dark:bg-gray-600 text-zen-sage-600 dark:text-gray-400 cursor-not-allowed"
            aria-readonly="true"
          />
          <p className="text-xs text-zen-sage-500 dark:text-gray-400 mt-1">
            {SETTINGS.PROFILE.EMAIL_READONLY}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="journaling-goal">
            Weekly Journaling Goal
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="journaling-goal"
              type="range"
              min="1"
              max="7"
              value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value))}
              className="flex-1 h-2 bg-zen-sage-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              disabled={isSaving}
            />
            <div className="text-center min-w-[80px]">
              <div className="text-lg font-bold text-zen-sage-800 dark:text-gray-200">
                {goal}
              </div>
              <div className="text-xs text-zen-sage-500 dark:text-gray-400">
                {goal === 1 ? 'day/week' : 'days/week'}
              </div>
            </div>
          </div>
          <p className="text-xs text-zen-sage-500 dark:text-gray-400 mt-2">
            {SETTINGS.PROFILE.GOAL_HELP}
          </p>
        </div>
        
        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || goal < 1 || goal > 7}
              className="flex items-center space-x-2 px-6 py-3 bg-zen-mint-400 text-white rounded-2xl hover:bg-zen-mint-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>Save Changes</span>
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default ProfileSettingsForm;