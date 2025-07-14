import React from 'react';
import { motion } from 'framer-motion';
import { PREMIUM } from '../../constants/uiStrings';

/**
 * FAQSection - Displays frequently asked questions about premium subscriptions
 * 
 * @component
 * @example
 * return <FAQSection />
 */
const FAQSection = React.memo(function FAQSection() {
  const faqItems = PREMIUM.FAQ.ITEMS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20">
        <h3 className="text-2xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-6 text-center">
          {PREMIUM.FAQ.TITLE}
        </h3>
        
        <div className="space-y-4 max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                {item.QUESTION}
              </h4>
              <p className="text-zen-sage-600 dark:text-gray-400 leading-relaxed">
                {item.ANSWER}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export default FAQSection;