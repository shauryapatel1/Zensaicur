import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertCircle } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { MoodLevel } from '../../types';
import MoodSelector from '../MoodSelector';
import PhotoUpload from '../PhotoUpload';
import PromptSection from './PromptSection';
import MoodSuggestion from './MoodSuggestion';
import AffirmationCard from './AffirmationCard';

/**
 * JournalEntryForm - Form for creating new journal entries
 * 
 * @component
 * @param {function} onSubmit - Function to handle form submission
 * @param {boolean} isSubmitting - Whether the form is currently submitting
 * @param {string} error - Error message if submission failed
 * @param {string} dailyPrompt - Prompt to inspire the user's journal entry
 * @param {boolean} isLoadingPrompt - Whether a new prompt is being loaded
 * @param {function} onGenerateNewPrompt - Function to generate a new prompt
 * @param {boolean} showMoodSuggestion - Whether to show AI mood suggestion
 * @param {MoodLevel|null} aiDetectedMood - AI-detected mood level
 * @param {function} onAcceptAiMood - Function to accept AI mood suggestion
 * @param {function} onDismissMoodSuggestion - Function to dismiss AI mood suggestion
 * @param {string} journalEntry - Current journal entry text
 * @param {function} onJournalTextChange - Function to update journal entry text
 * @param {string} entryTitle - Current entry title
 * @param {function} onTitleChange - Function to update entry title
 * @param {MoodLevel|undefined} selectedMood - Currently selected mood
 * @param {function} onMoodSelect - Function to update selected mood
 * @param {string|null} generatedAffirmation - Generated affirmation text
 * @param {string|null} generatedAffirmationSignedAudioUrl - Signed URL for affirmation audio
 * @param {boolean} isGeneratingSpeech - Whether speech is being generated
 * @param {boolean} isSpeechPlaying - Whether speech is currently playing
 * @param {function} onPlaySpeech - Function to play affirmation as speech
 * @param {function} onStopSpeech - Function to stop speech playback
 * @param {function} onCloseAffirmation - Function to close the affirmation card
 * @param {boolean} isAffirmationVisible - Whether to show the affirmation card
 * @param {boolean} isPremiumUser - Whether user has premium access
 * @param {function} onUpsellTrigger - Function to trigger premium upsell
 * @param {string|null} generatedAffirmation - Generated affirmation text
 * @param {string|null} generatedAffirmationSignedAudioUrl - Signed URL for affirmation audio
 * @param {boolean} isGeneratingSpeech - Whether speech is being generated
 * @param {boolean} isSpeechPlaying - Whether speech is currently playing
 * @param {function} onPlaySpeech - Function to play affirmation as speech
 * @param {function} onStopSpeech - Function to stop speech playback
 * @param {function} onCloseAffirmation - Function to close the affirmation card
 * @param {boolean} isAffirmationVisible - Whether to show the affirmation card
 * @param {boolean} isPremiumUser - Whether user has premium access
 * @param {function} onUpsellTrigger - Function to trigger premium upsell
 * @param {File|null} selectedPhoto - Currently selected photo
 */
interface JournalEntryFormProps {
  onSubmit: (content: string, title: string | null, mood: MoodLevel, photo: File | null) => Promise<void>;
  isSubmitting: boolean;
  error: string;
  dailyPrompt: string;
  isLoadingPrompt: boolean;
  onGenerateNewPrompt: () => void;
  showMoodSuggestion: boolean;
  aiDetectedMood: MoodLevel | null;
  onAcceptAiMood: () => void;
  onDismissMoodSuggestion: () => void; 
  journalEntry: string;
  onJournalTextChange: (text: string) => void;
  entryTitle: string;
  onTitleChange: (title: string) => void;
  selectedMood: MoodLevel | undefined;
  onMoodSelect: (mood: MoodLevel) => void;
  generatedAffirmation: string | null;
  generatedAffirmationSignedAudioUrl?: string | null;
  isGeneratingSpeech?: boolean;
  isSpeechPlaying?: boolean;
  isProcessingAudio?: boolean;
  onPlaySpeech?: () => void;
  onStopSpeech?: () => void;
  onCloseAffirmation?: () => void;
  isAffirmationVisible?: boolean;
  isPremiumUser?: boolean;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
  selectedPhoto?: File | null;
}

const JournalEntryForm = React.memo(function JournalEntryForm({
  onSubmit,
  isSubmitting,
  error,
  dailyPrompt,
  isLoadingPrompt,
  onGenerateNewPrompt,
  showMoodSuggestion,
  aiDetectedMood,
  onAcceptAiMood,
  onDismissMoodSuggestion, 
  journalEntry,
  onJournalTextChange,
  entryTitle,
  onTitleChange,
  selectedMood,
  onMoodSelect,
  generatedAffirmation,
  generatedAffirmationSignedAudioUrl,
  isGeneratingSpeech = false,
  isSpeechPlaying = false,
  isProcessingAudio = false,
  onPlaySpeech = () => Promise.resolve({ success: false }),
  onStopSpeech = () => {},
  onCloseAffirmation = () => {},
  isAffirmationVisible = true,
  isPremiumUser = true,
  onUpsellTrigger = () => {},
  selectedPhoto = null, 
  onPhotoSelect = () => {}
}: JournalEntryFormProps) {
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const handleSubmitAsync = async () => {
    if (!journalEntry.trim() || !selectedMood) {
      return;
    }
    
    // Add transaction for performance monitoring
    const transaction = Sentry.startTransaction({
      name: 'journal-entry-submit'
    });
    
    // Set the transaction on the current scope
    Sentry.configureScope(scope => {
      scope.setSpan(transaction);
    });

    try {
      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: 'journal',
        message: 'Submitting journal entry',
        level: 'info',
        data: {
          hasTitle: !!entryTitle.trim(),
          moodLevel: selectedMood,
          hasPhoto: !!selectedPhoto,
          contentLength: journalEntry.length
        }
      });
      
      await onSubmit(
        journalEntry,
        entryTitle.trim() || null,
        selectedMood,
        selectedPhoto
      );
    } catch (error) {
      // Error handling is managed by the parent component
      Sentry.captureException(error);
      console.error('Error submitting journal entry:', error);
    } finally {
      // Finish the transaction
      transaction.finish();
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Prompt Section */}
      <PromptSection
        dailyPrompt={dailyPrompt}
        isLoadingPrompt={isLoadingPrompt}
        onGenerateNewPrompt={(forceRefresh = false) => onGenerateNewPrompt(forceRefresh)}
        isPremiumUser={isPremiumUser} 
        onUpsellTrigger={onUpsellTrigger}
      />      
      
      {/* Entry Title Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="entry-title">
          Entry Title (Optional)
        </label>
        <input
          id="entry-title"
          type="text"
          value={entryTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Give your entry a title..."
          className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border border-zen-mint-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent transition-all duration-300 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Mood Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-3" id="mood-selector-label">
          How are you feeling?
        </label>
        <MoodSelector
          selectedMood={selectedMood}
          onMoodSelect={onMoodSelect}
          disabled={isSubmitting}
          aria-labelledby="mood-selector-label"
        />
      </div>

      {/* AI Mood Suggestion */}
      <MoodSuggestion
        showMoodSuggestion={showMoodSuggestion}
        aiDetectedMood={aiDetectedMood}
        onAcceptAiMood={onAcceptAiMood}
        onDismissMoodSuggestion={onDismissMoodSuggestion}
      />      
      
      {/* Affirmation Card */}
      <AffirmationCard
        affirmation={generatedAffirmation}
        isVisible={!!generatedAffirmation && isAffirmationVisible}
        signedAudioUrl={generatedAffirmationSignedAudioUrl || null}
        isSpeechPlaying={isSpeechPlaying}
        isProcessingAudio={isProcessingAudio}
        onPlaySpeech={onPlaySpeech}
        onStopSpeech={onStopSpeech}
        onClose={onCloseAffirmation}
        showVoiceButton={false}
        isPremiumUser={isPremiumUser}
        onUpsellTrigger={onUpsellTrigger}
      />      
      
      {/* Photo Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2">
          Photo Upload (Optional)
        </label>
        <PhotoUpload 
          selectedPhoto={selectedPhoto} 
          onPhotoSelect={onPhotoSelect}
          disabled={isSubmitting}
          isPremiumUser={isPremiumUser}
          onUpsellTrigger={() => onUpsellTrigger?.('Photo Upload', 'Add photos to your journal entries to capture memories visually')}
        />
      </div>

      {/* Journal Entry Textarea */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="journal-entry">
          Your thoughts
        </label>
        <div className="relative">
          <textarea
            id="journal-entry"
            value={journalEntry}
            onChange={(e) => onJournalTextChange(e.target.value)}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}
            placeholder="Share what's on your mind... Zeno is here to listen."
            rows={8}
            className="w-full px-4 py-4 bg-white/50 dark:bg-gray-700/50 border border-zen-mint-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent transition-all duration-300 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-500 resize-none"
            disabled={isSubmitting}
            aria-required="true"
          />
          {/* Character count */}
          <div className="absolute bottom-3 right-3 text-xs text-zen-sage-400 dark:text-gray-500">
            {journalEntry.length} characters
          </div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleSubmitAsync} 
          disabled={!journalEntry.trim() || !selectedMood || isSubmitting}
          className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white font-semibold rounded-2xl hover:from-zen-mint-500 hover:to-zen-mint-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Save journal entry"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>Saving your thoughts...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" aria-hidden="true" />
              <span>Save Entry</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
});

export default JournalEntryForm;