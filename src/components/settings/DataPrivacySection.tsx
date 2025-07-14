import React from 'react';
import { Download, Shield } from 'lucide-react';
import { SETTINGS } from '../../constants/uiStrings';

/**
 * DataPrivacySection - Component for data privacy related actions like exporting data
 * 
 * @component
 * @param {boolean} isExporting - Whether data export is in progress
 * @param {function} onExportData - Function to trigger data export
 * 
 * @example
 * return (
 *   <DataPrivacySection
 *     isExporting={isExporting}
 *     onExportData={handleExportData}
 *   />
 * )
 */
interface DataPrivacySectionProps {
  isExporting: boolean;
  onExportData: () => Promise<void>;
}

const DataPrivacySection = React.memo(function DataPrivacySection({
  isExporting,
  onExportData
}: DataPrivacySectionProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-600/20">
      <h3 className="text-lg font-display font-bold text-zen-sage-800 dark:text-gray-200 mb-4 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-zen-mint-500" aria-hidden="true" /> 
        {SETTINGS.DATA_PRIVACY.TITLE}
      </h3>
      
      <div className="space-y-4">
        <button
          onClick={onExportData}
          disabled={isExporting}
          className="flex items-center space-x-2 px-4 py-3 bg-zen-sage-100 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 rounded-2xl hover:bg-zen-sage-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
          aria-label="Export your journal data"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-zen-sage-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" aria-hidden="true" /> 
              <span>{SETTINGS.DATA_PRIVACY.EXPORT_BUTTON}</span>
            </>
          )}
        </button>
        
        <p className="text-xs text-zen-sage-500 dark:text-gray-400">
          {SETTINGS.DATA_PRIVACY.EXPORT_HELP}
        </p>
      </div>
     
     {/* Support Contact */}
     <div className="mt-4 pt-4 border-t border-zen-sage-200 dark:border-gray-600">
       <h4 className="text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
         {SETTINGS.SUPPORT.TITLE}
       </h4>
       <p className="text-xs text-zen-sage-500 dark:text-gray-400">
         {SETTINGS.SUPPORT.CONTACT}{' '}
         <a 
           href={`mailto:${SETTINGS.SUPPORT.EMAIL}`} 
           className="text-zen-mint-600 dark:text-zen-mint-400 hover:underline"
         >
           {SETTINGS.SUPPORT.EMAIL}
         </a>
       </p>
     </div>
    </div>
  );
});

export default DataPrivacySection;