import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UPSELL } from '../constants/uiStrings';

/**
 * UpsellModal - Displays a modal to encourage users to upgrade to premium
 * 
 * @component
 * @param {boolean} isOpen - Whether the modal is currently visible
 * @param {function} onClose - Function to call when the modal is closed
 * @param {string} featureName - Name of the premium feature being promoted
 * @param {string} featureDescription - Description of the premium feature
 * 
 * @example
 * return (
 *   <UpsellModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     featureName="Photo Uploads"
 *     featureDescription="Add photos to your journal entries to capture special moments."
 *   />
 * )
 */
interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
}

const UpsellModal = React.memo(function UpsellModal({ 
  isOpen, 
  onClose, 
  featureName, 
  featureDescription 
}: UpsellModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Focus management for accessibility
   * When modal opens, focus the close button
   * When modal closes, restore focus to the previously focused element
   */
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Focus the close button when modal opens
      closeButtonRef.current.focus();
    }

    // Save the element that had focus before the modal opened
    const previouslyFocusedElement = document.activeElement;

    return () => {
      // Restore focus when modal closes
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen]);

  /**
   * Trap focus within the modal for keyboard navigation
   * @param {KeyboardEvent} e - The keyboard event
   */
  const handleTabKey = (e: KeyboardEvent) => {
    if (!modalRef.current || e.key !== 'Tab') return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // If shift+tab and on first element, move to last element
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } 
    // If tab and on last element, move to first element
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  /**
   * Handle keyboard events for the modal
   * - Escape key closes the modal
   * - Tab key traps focus within the modal
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
        handleTabKey(e);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  /**
   * Navigate to the premium page when user clicks upgrade
   */
  const handleUpgrade = () => {
    onClose();
    navigate('/premium');
  };

  const premiumFeatures = UPSELL.FEATURES;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-zen-mint-400 to-zen-peach-400 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div> 
                <h3 id="modal-title" className="text-xl font-display font-bold text-zen-sage-800 dark:text-gray-200"> 
                  {UPSELL.TITLE}
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1 text-zen-sage-400 dark:text-gray-500 hover:text-zen-sage-600 dark:hover:text-gray-300 rounded-full"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Feature Info */}
            <div className="mb-6">
              <div className="bg-zen-mint-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-zen-mint-500" aria-hidden="true" />
                  {featureName}
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400 text-sm">
                  {featureDescription}
                </p>
              </div>
              
              <p className="text-zen-sage-700 dark:text-gray-300 mb-4">
                Your free trial has ended. Subscribe to continue using Zensai:
              </p>
              
              <ul className="space-y-2 mb-6" aria-label="Premium features">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-zen-mint-500 mt-1 flex-shrink-0" aria-hidden="true" />
                    <span className="text-zen-sage-700 dark:text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul> 
            </div>
            
            {/* Actions */}
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full py-3 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-medium rounded-xl hover:from-zen-mint-500 hover:to-zen-mint-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                aria-label="Upgrade to premium with 7-day free trial"
              >
                <Crown className="w-4 h-4" aria-hidden="true" />
                <span>{UPSELL.BUTTONS.UPGRADE}</span>
                <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" /> 
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-700 dark:text-gray-300 font-medium rounded-xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 transition-all duration-300"
                aria-label="Dismiss dialog"
              >
                {UPSELL.BUTTONS.LATER}
              </button>
            </div>
            
            {/* Free Trial Note */}
            <p className="text-center text-zen-sage-500 dark:text-gray-400 text-xs mt-4" aria-live="polite">
              {UPSELL.TRIAL_NOTE}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default UpsellModal;