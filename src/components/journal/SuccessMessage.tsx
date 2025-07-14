import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

/**
 * SuccessMessage - Displays success messages in a consistent format
 * 
 * @component
 * @param {string} message - Success message to display
 * @param {boolean} show - Whether to show the message
 * 
 * @example
 * return (
 *   <SuccessMessage
 *     message="Journal entry saved successfully!"
 *     show={showSuccess}
 *   />
 * )
 */
interface SuccessMessageProps {
  message: string;
  show: boolean;
}

const SuccessMessage = React.memo(function SuccessMessage({ message, show }: SuccessMessageProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300"
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-white" aria-hidden="true" />
          <span className="font-medium">{message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SuccessMessage;