import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Apple } from 'lucide-react';
import { PREMIUM } from '../../constants/uiStrings';

/**
 * MobileAppsSection - Displays information about upcoming mobile apps
 * 
 * @component
 * @example
 * return <MobileAppsSection />
 */
const MobileAppsSection = React.memo(function MobileAppsSection() {
  const { MOBILE_APPS } = PREMIUM;
  
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-600/20">
        <h3 className="text-2xl font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 text-center">
          {MOBILE_APPS.TITLE}
        </h3>
        
        <p className="text-lg text-zen-sage-600 dark:text-gray-400 text-center mb-8 max-w-2xl mx-auto">
          {MOBILE_APPS.SUBTITLE}
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Android App */}
          <motion.div
            className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6 shadow-md border border-white/20 dark:border-gray-600/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="flex items-start space-x-4">
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-xl">
                <Smartphone className="w-6 h-6 text-green-500" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  {MOBILE_APPS.ANDROID}
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                  {MOBILE_APPS.DESCRIPTION}
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full inline-block text-sm text-green-700 dark:text-green-300">
                  {MOBILE_APPS.RELEASE_DATE}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* iOS App */}
          <motion.div
            className="bg-white/80 dark:bg-gray-700/80 rounded-2xl p-6 shadow-md border border-white/20 dark:border-gray-600/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div className="flex items-start space-x-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl">
                <Apple className="w-6 h-6 text-blue-500" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-lg font-display font-semibold text-zen-sage-800 dark:text-gray-200 mb-2">
                  {MOBILE_APPS.IOS}
                </h4>
                <p className="text-zen-sage-600 dark:text-gray-400 mb-4">
                  {MOBILE_APPS.DESCRIPTION}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full inline-block text-sm text-blue-700 dark:text-blue-300">
                  {MOBILE_APPS.RELEASE_DATE}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-zen-sage-600 dark:text-gray-400 font-medium">
            {MOBILE_APPS.EARLY_ACCESS}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export default MobileAppsSection;