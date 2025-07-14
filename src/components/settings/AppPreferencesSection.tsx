import React from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * AppPreferencesSection - Component for app preferences like dark mode and notifications
 * 
 * @component
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @param {boolean} notifications - Whether notifications are enabled
 * @param {function} onToggleDarkMode - Function to toggle dark mode
 * @param {function} onToggleNotifications - Function to toggle notifications
 * 
 * @example
 * return (
 *   <AppPreferencesSection
 *     isDarkMode={isDarkMode}
 *     notifications={notifications}
 *     onToggleDarkMode={handleToggleDarkMode}
 *     onToggleNotifications={handleToggleNotifications}
 *   />
 * )
 */
interface AppPreferencesSectionProps {
  isDarkMode: boolean;
  notifications: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  onToggleNotifications: (enabled: boolean) => void;
}

const AppPreferencesSection = React.memo(function AppPreferencesSection({
  isDarkMode,
  notifications,
  onToggleDarkMode,
  onToggleNotifications
}: AppPreferencesSectionProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
      <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
        {SETTINGS.PREFERENCES.TITLE}
      </h3>
      
      <div className="space-y-4">
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl">
          <div className="flex items-center space-x-3">
            {isDarkMode ? 
              <Moon className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" aria-hidden="true" /> : 
              <Sun className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" aria-hidden="true" />
            }
            <div>
              <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">{SETTINGS.PREFERENCES.DARK_MODE.LABEL}</h4>
              <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                {isDarkMode ? SETTINGS.PREFERENCES.DARK_MODE.ENABLED : SETTINGS.PREFERENCES.DARK_MODE.DISABLED}
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleDarkMode(!isDarkMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDarkMode ? 'bg-zen-mint-400' : 'bg-zen-sage-300'
            }`}
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Toggle dark mode"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-4 bg-zen-sage-50 dark:bg-gray-700 rounded-2xl">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-zen-sage-600 dark:text-gray-300" aria-hidden="true" />
            <div>
              <h4 className="font-medium text-zen-sage-800 dark:text-gray-200">{SETTINGS.PREFERENCES.NOTIFICATIONS.LABEL}</h4>
              <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                {SETTINGS.PREFERENCES.NOTIFICATIONS.DESCRIPTION}
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifications ? 'bg-zen-mint-400' : 'bg-zen-sage-300'
            }`}
            role="switch"
            aria-checked={notifications}
            aria-label="Toggle notifications"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
});

export default AppPreferencesSection;