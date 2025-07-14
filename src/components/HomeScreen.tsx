import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { useJournal } from '../hooks/useJournal';
import { useJournalFlow } from '../hooks/useJournalFlow';
import { usePremium } from '../hooks/usePremium';
import JournalEntryForm from './journal/JournalEntryForm';
import { MoodLevel } from '../types';

export default function HomeScreen() {
  const { refreshData, addEntry } = useJournal();
  
  const {
    reflectionQuestion,
    isLoadingQuestion,
    journalText,
    entryTitle,
    selectedMood,
    generatedAffirmation,
    generatedAffirmationSignedAudioUrl,
    isAnalyzing,
    isGeneratingSpeech,
    isSpeechPlaying,
    error: journalFlowError,
    showMoodSuggestion,
    aiDetectedMood,
    handleTitleChange,
    handleJournalTextChange,
    handleMoodSelect,
    handleAnalyzeAndSave,
    onAcceptAiMood,
    onDismissMoodSuggestion,
    playGeneratedAffirmation,
    stopSpeech,
    fetchReflectionQuestion: fetchReflectionQuestionInternal,
    clearError,
    generationProgress,
    audioError
  } = useJournalFlow();
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showAffirmationCard, setShowAffirmationCard] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const { isPremium, showUpsellModal, isTrialActive } = usePremium();
  
  // Wrapper for fetchReflectionQuestion to handle force refresh
  const fetchReflectionQuestion = useCallback((forceRefresh = false) => {
    fetchReflectionQuestionInternal(forceRefresh);
  }, [fetchReflectionQuestionInternal]);
  
  // Fetch reflection question on mount
  useEffect(() => {
    // Only fetch if we don't already have a question
    if (!reflectionQuestion) {
      fetchReflectionQuestion();
    }
  }, [fetchReflectionQuestion, reflectionQuestion]);

  // Refresh data periodically to ensure badges are up-to-date
  useEffect(() => {
    // Initial refresh
    refreshData();
    
    // Set up interval for periodic refresh (every 5 minutes)
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshData]);
  
  // Handle form submission
  const handleSubmit = async (
    content: string,
    title: string | null,
    mood: MoodLevel, 
    photoFile: File | null
  ) => {
    try {
      // Add breadcrumb for debugging
      Sentry.addBreadcrumb({
        category: 'journal',
        message: 'Submitting journal entry',
        level: 'info',
        data: {
          hasTitle: !!title,
          moodLevel: mood,
          hasPhoto: !!photoFile,
          contentLength: content.length
        }
      });
      
      // Step 1: Analyze mood and generate affirmation
      console.log('Analyzing and generating affirmation...');
      const { success, affirmationText, affirmationSource } = await handleAnalyzeAndSave();
      
      if (!success) {
        console.error('Failed to analyze and generate affirmation');
        return;
      }
      
      // Step 2: Save the journal entry with the generated affirmation
      console.log('Saving journal entry with affirmation:', { 
        affirmationText, 
        photoFile: photoFile ? photoFile.name : 'none',
        affirmationSource: affirmationSource || 'fallback'
      });
      
      const saveResult = await addEntry(
        content,
        title,
        mood,
        photoFile,
        affirmationText || null, 
        null, // No audio URL yet - will be generated on demand
        affirmationSource || 'fallback' 
      );
      
      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save journal entry');
        return;
      }
      
      // Step 3: Show success message and affirmation card
      setShowSuccess(true);
      setSuccessMessage('Journal entry saved successfully!');
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      // Show the affirmation card after a successful save
      setShowAffirmationCard(true);
      
      // Reset photo selection
      setSelectedPhoto(null);
    } catch (err) {
      // Capture the error with additional context
      Sentry.captureException(err, {
        tags: {
          section: 'journal',
          operation: 'handleSubmit'
        }
      });
      
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <>
      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed top-4 right-4 bg-gradient-to-r from-zen-mint-400 to-zen-mint-500 text-white px-6 py-4 rounded-2xl shadow-xl z-50 border border-zen-mint-300"
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-white" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journal Entry Form */}
      <JournalEntryForm
        onSubmit={(content, title, mood, photoFile) => handleSubmit(content, title, mood, photoFile)}
        isSubmitting={isAnalyzing}
        error={journalFlowError || ""}
        dailyPrompt={reflectionQuestion}
        isLoadingPrompt={isLoadingQuestion}
        onGenerateNewPrompt={fetchReflectionQuestion}
        isPremiumUser={isPremium || isTrialActive}
        onUpsellTrigger={showUpsellModal}
        showMoodSuggestion={showMoodSuggestion}
        aiDetectedMood={aiDetectedMood}
        onAcceptAiMood={onAcceptAiMood}
        onDismissMoodSuggestion={onDismissMoodSuggestion}
        journalEntry={journalText}
        onJournalTextChange={handleJournalTextChange}
        entryTitle={entryTitle}
        onTitleChange={handleTitleChange}
        selectedMood={selectedMood}
        onMoodSelect={handleMoodSelect}
        generatedAffirmation={generatedAffirmation}
        generatedAffirmationSignedAudioUrl={generatedAffirmationSignedAudioUrl}
        isGeneratingSpeech={isGeneratingSpeech}
        isSpeechPlaying={isSpeechPlaying}
        onPlaySpeech={playGeneratedAffirmation}
        onStopSpeech={stopSpeech}
        onCloseAffirmation={() => setShowAffirmationCard(false)}
        isAffirmationVisible={!!generatedAffirmation && showAffirmationCard}
        isPremiumUser={isPremium || isTrialActive}
        onUpsellTrigger={showUpsellModal}
        selectedPhoto={selectedPhoto}
        onPhotoSelect={setSelectedPhoto}
        generationProgress={generationProgress}
        audioError={audioError}
      />
    </>
  );
}