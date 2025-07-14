import React from 'react';
import { LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * AccountActionsSection - Component for account-related actions like sign out and account deletion
 * 
 * @component
 * @param {function} onShowLogoutConfirm - Function to show the logout confirmation dialog
 * @param {function} onShowDeleteConfirm - Function to show the delete account confirmation dialog
 * 
 * @example
 * return (
 *   <AccountActionsSection
 *     onShowLogoutConfirm={() => setShowLogoutConfirm(true)}
 *     onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
 *   />
 * )
 */
interface AccountActionsSectionProps {
  onShowLogoutConfirm: () => void;
  onShowDeleteConfirm: () => void;
}

const AccountActionsSection = React.memo(function AccountActionsSection({
  onShowLogoutConfirm,
  onShowDeleteConfirm
}: AccountActionsSectionProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
      <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-zen-peach-500" aria-hidden="true" /> 
        {SETTINGS.ACCOUNT_ACTIONS.TITLE}
      </h3>
      
      <div className="space-y-4">
        <button
          onClick={onShowLogoutConfirm}
          className="flex items-center space-x-2 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors w-full"
          aria-label="Sign out of your account"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> 
          <span>{SETTINGS.ACCOUNT_ACTIONS.SIGN_OUT}</span>
        </button>
        
        <button
          onClick={onShowDeleteConfirm}
          className="flex items-center space-x-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full"
          aria-label="Delete your account permanently"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" /> 
          <span>{SETTINGS.ACCOUNT_ACTIONS.DELETE_ACCOUNT}</span>
        </button>
      </div>
    </div>
  );
});

export default AccountActionsSection;