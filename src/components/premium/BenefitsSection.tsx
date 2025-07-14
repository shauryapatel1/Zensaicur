import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PREMIUM } from '../../constants/uiStrings';

/**
 * BenefitsSection - Displays the key benefits of premium subscription
 * 
 * @component
 * @example
 * return <BenefitsSection />
 */
const BenefitsSection = React.memo(function BenefitsSection() {
  const { BENEFITS_SECTION } = PREMIUM;
  
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20">
        <h3 className="text-2xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 text-center">
          {BENEFITS_SECTION.TITLE}
        </h3>
        
        <motion.p 
          className="text-lg text-zen-sage-600 dark:text-gray-400 text-center mb-4 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {BENEFITS_SECTION.SUBTITLE}
        </motion.p>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {BENEFITS_SECTION.ITEMS.map((benefit, index) => (
            <motion.div
              key={benefit.TITLE}
              className="flex items-start space-x-3 bg-white/70 dark:bg-gray-700/70 p-4 rounded-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (index * 0.1) }}
            >
              <div className="bg-zen-mint-100 dark:bg-zen-mint-900/30 p-2 rounded-full">
                <Check className="w-4 h-4 text-zen-mint-600 dark:text-zen-mint-400" />
              </div>
              <div>
                <h4 className="font-medium text-zen-sage-800 dark:text-gray-200 mb-1">
                  {benefit.TITLE}
                </h4>
                <p className="text-sm text-zen-sage-600 dark:text-gray-400">
                  {benefit.DESCRIPTION}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export default BenefitsSection;