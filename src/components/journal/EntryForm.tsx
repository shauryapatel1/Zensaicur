import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { MoodLevel } from '../../types';
import MoodSelector from '../MoodSelector';
import PhotoUpload from '../PhotoUpload';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * EntryForm - Form for creating or editing journal entries
 * 
 * @component
 * @param {function} onSubmit - Function to handle form submission
 * @param {boolean} isSubmitting - Whether the form is currently submitting
 * @param {boolean} [isPremiumUser=true] - Whether user has premium access
 * @param {function} [onUpsellTrigger] - Function to trigger premium upsell
 * 
 * @example
 * return (
 *   <EntryForm
 *     onSubmit={handleSubmit}
 *     isSubmitting={isSubmitting}
 *     isPremiumUser={isPremium}
 *     onUpsellTrigger={handleShowUpsellModal}
 *   />
 * )
 */
interface EntryFormProps {
  onSubmit: (content: string, title: string | null, mood: MoodLevel, photo: File | null) => Promise<void>;
  isSubmitting: boolean;
  isPremiumUser?: boolean;
  onUpsellTrigger?: () => void;
}

export default function EntryForm({
  onSubmit,
  isSubmitting,
  isPremiumUser = true,
  onUpsellTrigger
}: EntryFormProps) {
  const [journalEntry, setJournalEntry] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodLevel>();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const handleSubmit = () => {
    if (!journalEntry.trim() || !selectedMood) return;
    onSubmit(journalEntry, entryTitle, selectedMood, selectedPhoto);
  };

  return (
    <div className="space-y-6">
      {/* Entry Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor="entry-title">
          Entry Title (Optional)
        </label>
        <input
          id="entry-title"
          type="text"
          value={entryTitle}
          onChange={(e) => setEntryTitle(e.target.value)}
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
          onMoodSelect={setSelectedMood}
          disabled={isSubmitting}
          aria-labelledby="mood-selector-label"
        />
      </div>

      {/* Photo Upload */}
      <div className="mb-6">
        <PhotoUpload
          selectedPhoto={selectedPhoto}
          onPhotoSelect={setSelectedPhoto}
          disabled={isSubmitting}
          isPremiumUser={isPremiumUser}
          onUpsellTrigger={onUpsellTrigger}
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
            onChange={(e) => setJournalEntry(e.target.value)}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}
            placeholder="Share what's on your mind... Zeno is here to listen."
            rows={8}
            className="w-full px-4 py-4 bg-white/50 dark:bg-gray-700/50 border border-zen-mint-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent transition-all duration-300 text-zen-sage-800 dark:text-gray-200 placeholder-zen-sage-400 dark:placeholder-gray-500 resize-none"
            disabled={isSubmitting}
            aria-required="true"
          />
          {/* Character count */}
          <div className="absolute bottom-3 right-3 text-xs text-zen-sage-400 dark:text-gray-500" aria-live="polite">
            {journalEntry.length} characters
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleSubmit}
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
}