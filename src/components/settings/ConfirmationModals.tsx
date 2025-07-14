import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * LogoutConfirmModal - Confirmation dialog for signing out
 * 
 * @component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when canceling
 * @param {function} onConfirm - Function to call when confirming logout
 * 
 * @example
 * return (
 *   <LogoutConfirmModal
 *     isOpen={showLogoutConfirm}
 *     onClose={() => setShowLogoutConfirm(false)}
 *     onConfirm={handleLogout}
 *   />
 * )
 */
interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal = React.memo(function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-600/20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="logout-title" className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4">
            {SETTINGS.MODALS.LOGOUT.TITLE}
          </h3>
          <p className="text-zen-sage-600 dark:text-gray-400 mb-6">
            {SETTINGS.MODALS.LOGOUT.MESSAGE}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors"
            >
              {SETTINGS.MODALS.LOGOUT.CANCEL}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-zen-peach-400 text-white rounded-2xl hover:bg-zen-peach-500 transition-colors"
            >
              {SETTINGS.MODALS.LOGOUT.CONFIRM}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * DeleteAccountModal - Confirmation dialog for account deletion
 * 
 * @component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when canceling
 * @param {function} onConfirm - Function to call when confirming deletion
 * @param {string} confirmText - Current text in the confirmation input
 * @param {function} onConfirmTextChange - Function to update confirmation text
 * @param {boolean} isConfirmDisabled - Whether the confirm button should be disabled
 * 
 * @example
 * return (
 *   <DeleteAccountModal
 *     isOpen={showDeleteConfirm}
 *     onClose={() => setShowDeleteConfirm(false)}
 *     onConfirm={handleDeleteAccount}
 *     confirmText={deleteConfirmText}
 *     onConfirmTextChange={setDeleteConfirmText}
 *     isConfirmDisabled={deleteConfirmText !== 'DELETE'}
 *   />
 * )
 */
interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  isConfirmDisabled: boolean;
}

export const DeleteAccountModal = React.memo(function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  confirmText,
  onConfirmTextChange,
  isConfirmDisabled
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-600/20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="delete-account-title" className="text-lg font-display font-bold text-red-600 dark:text-red-400 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" aria-hidden="true" /> 
            {SETTINGS.MODALS.DELETE.TITLE}
          </h3>
          <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
            {SETTINGS.MODALS.DELETE.MESSAGE}
          </p>
          <p className="text-zen-sage-600 dark:text-gray-400 mb-6">
            {SETTINGS.ACCOUNT_ACTIONS.DELETE_CONFIRMATION}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 mb-6"
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm account deletion"
          />
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-colors"
            >
              {SETTINGS.MODALS.DELETE.CANCEL}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {SETTINGS.MODALS.DELETE.CONFIRM}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});