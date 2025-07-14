import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Edit3, Trash2, Eye, ChevronUp, ChevronDown, X, Save, Sparkles } from 'lucide-react';
import { useVoiceSynthesis } from '../../hooks/useVoiceSynthesis';
import { useJournal } from '../../hooks/useJournal';
import { useAuth } from '../../contexts/AuthContext';
import { MoodLevel } from '../../types';
import { moods } from '../../data/moods';
import MoodSelector from '../MoodSelector';
import VoiceButton from '../VoiceButton';
import { JOURNAL } from '../../constants/uiStrings';

/**
 * Interface for journal entry data
 * @interface JournalEntry
 */
interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  signedPhotoUrl?: string;
  affirmation_text?: string | null;
  affirmation_audio_url?: string | null;
  affirmation_source?: string | null;
  signedAudioUrl?: string | null;
  created_at: string;
  updated_at: string;
  title?: string | null;
  photo_filename?: string | null;
}

/**
 * JournalEntryCard - Displays a single journal entry with view/edit functionality
 * 
 * @component
 * @param {JournalEntry} entry - Journal entry data
 * @param {boolean} isExpanded - Whether the entry is expanded to show full content
 * @param {boolean} isEditing - Whether the entry is in edit mode
 * @param {function} onToggleExpand - Function to toggle expanded state
 * @param {function} onEdit - Function to enter edit mode
 * @param {function} onDelete - Function to delete the entry
 * @param {function} onSaveEdit - Function to save edits
 * @param {function} onCancelEdit - Function to cancel editing
 * @param {number} index - Index of the entry in the list
 * @param {number} delay - Animation delay
 * 
 * @example
 * return (
 *   <JournalEntryCard
 *     entry={entry}
 *     isExpanded={expandedEntry === entry.id}
 *     isEditing={editingEntry?.id === entry.id}
 *     onToggleExpand={toggleEntryExpansion}
 *     onEdit={handleEditEntry}
 *     onDelete={handleDeleteEntry}
 *     onSaveEdit={handleSaveEdit}
 *     onCancelEdit={() => setEditingEntry(null)}
 *     index={index}
 *     delay={0.1}
 *   />
 * )
 */
interface JournalEntryCardProps {
  entry: JournalEntry;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  onCancelEdit: () => void;
  index: number;
  delay: number;
  isPremiumUser?: boolean;
  onUpsellTrigger?: (featureName: string, featureDescription: string) => void;
}

const JournalEntryCard = React.memo(function JournalEntryCard({
  entry,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  index,
  delay,
  isPremiumUser = true,
  onUpsellTrigger = () => {}
}: JournalEntryCardProps) {
  const [editContent, setEditContent] = useState(entry.content);
  const [editTitle, setEditTitle] = useState(entry.title || '');
  const [editMood, setEditMood] = useState<MoodLevel>(getMoodLevel(entry.mood));
  
  // Get the current user from auth context
  const { user } = useAuth();
  
  // Use the voice synthesis hook for audio playback
  const { 
    isGenerating: isGeneratingSpeech,
    isPlaying: isSpeechPlaying,
    isProcessing: isProcessingAudio,
    playAudio,
    stopAudio,
    generateSpeech,
    error: audioError
  } = useVoiceSynthesis();
  
  // Use the journal hook for updating entries
  const { refreshData, updateEntry } = useJournal();
  
  const entryMoodData = moods.find(m => m.level === getMoodLevel(entry.mood));
  const isEditable = !isEditing;
  const needsExpansion = entry.content.length > 150;

  function getMoodLevel(moodString: string): MoodLevel {
    const moodMap: Record<string, MoodLevel> = {
      'struggling': 1,
      'low': 2,
      'neutral': 3,
      'good': 4,
      'amazing': 5
    };
    return moodMap[moodString] || 3;
  }

  function getMoodString(moodLevel: MoodLevel): string {
    const moodStringMap: Record<MoodLevel, string> = {
      1: 'struggling',
      2: 'low',
      3: 'neutral',
      4: 'good',
      5: 'amazing'
    };
    return moodStringMap[moodLevel] || 'neutral';
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const handleSave = async () => {
    const updates = {
      content: editContent,
      title: editTitle || null,
      mood: getMoodString(editMood)
    };
    
    await onSaveEdit(entry.id, updates);
  };
  
  const handlePlayAffirmation = async () => {
    if (!entry.affirmation_text) {
      console.log('No affirmation text available to play');
      return;
    }
    
    // If we already have a signed URL, use it
    if (entry.signedAudioUrl) {
      try {
        console.log('Playing audio from existing signed URL:', entry.signedAudioUrl);
        await playAudio(entry.signedAudioUrl);
      } catch (error) {
        console.error('Failed to play stored audio:', error);
      }
      return;
    }
    
    // If we have an affirmation_audio_url but no signed URL, we need to refresh the data
    if (entry.affirmation_audio_url && !entry.signedAudioUrl) {
      console.log('Audio URL exists but signed URL is missing, refreshing data:', entry.affirmation_audio_url);
      await refreshData();
      return;
    }
    
    // If we don't have an audio URL, generate one on-demand
    if (!entry.affirmation_audio_url && isPremiumUser) {
      try {
        console.log('Generating speech on-demand for affirmation:', entry.affirmation_text);
        
        // Generate speech and save to storage
        const storageUrl = await generateSpeech(
          entry.affirmation_text,
          true, // save to storage
          user?.id || null // use user ID for storage path
        );
        
        if (storageUrl) {
          console.log('Speech generated and saved at:', storageUrl);
          
          // Update the entry with the new audio URL
          await updateEntry(entry.id, {
            affirmation_audio_url: storageUrl 
          });
          
          // Refresh data to get the signed URL
          await refreshData();
          
          console.log('Entry updated with audio URL:', storageUrl);
          console.log('Refreshing data to get signed URL');
        }
      } catch (error) {
        console.error('Failed to generate speech:', error);
        // Show a user-friendly error message
        alert('Unable to generate speech at this time. Please try again later.');
      }
    } else if (!isPremiumUser) {
      // Trigger upsell for non-premium users
      onUpsellTrigger('Voice Affirmations', 'Listen to your affirmations with natural-sounding voice');
    } else if (!entry.affirmation_audio_url) {
      console.error('No affirmation audio URL and unable to generate one');
    }
  };
  
  const handleStopAffirmation = () => {
    stopAudio();
  };

  return (
    <motion.div
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-600/20 overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay }}
      whileHover={{ scale: isEditable ? 1.01 : 1 }}
    >
      {isEditing ? (
        /* Edit Mode */
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-semibold text-zen-sage-800 dark:text-gray-200">
              Edit Entry
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="p-2 text-zen-mint-600 hover:text-zen-mint-700 hover:bg-zen-mint-100 dark:hover:bg-zen-mint-900/30 rounded-lg transition-colors"
                aria-label="Save changes"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Cancel editing"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor={`edit-title-${entry.id}`}>
                Title (optional)
              </label>
              <input
                id={`edit-title-${entry.id}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Add a title to your entry..."
                className="w-full px-4 py-2 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" id={`edit-mood-${entry.id}-label`}>
                How are you feeling?
              </label>
              <MoodSelector
                selectedMood={editMood}
                onMoodSelect={setEditMood}
                size="md"
                layout="horizontal"
                aria-labelledby={`edit-mood-${entry.id}-label`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zen-sage-700 dark:text-gray-300 mb-2" htmlFor={`edit-content-${entry.id}`}>
                Your thoughts
              </label>
              <textarea
                id={`edit-content-${entry.id}`}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-zen-sage-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 dark:bg-gray-700 text-zen-sage-800 dark:text-gray-200 resize-none"
                placeholder="What's on your mind?"
              />
            </div>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl" aria-hidden="true">{entryMoodData?.emoji}</div>
              <div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-zen-sage-400 dark:text-gray-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-zen-sage-600 dark:text-gray-400">
                    {formatTime(entry.created_at)}
                  </span>
                  <span className="text-xs text-zen-sage-400 dark:text-gray-500" aria-hidden="true">•</span>
                  <span className="text-sm text-zen-sage-600 dark:text-gray-400">
                    {entryMoodData?.label}
                  </span>
                </div>
                {entry.title && (
                  <h4 className="font-display font-semibold text-zen-sage-800 dark:text-gray-200 mt-1">
                    {entry.title}
                  </h4>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(entry)}
                className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Edit entry"
              >
                <Edit3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                aria-label="Delete entry"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => onToggleExpand(entry.id)}
                className="p-2 text-zen-sage-500 hover:text-zen-sage-700 hover:bg-zen-sage-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={isExpanded ? "Collapse entry" : "Expand entry"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className={`text-zen-sage-700 dark:text-gray-300 leading-relaxed ${
            isExpanded ? '' : 'line-clamp-3'
          }`}>
            {entry.content}
          </div>

          {entry.signedPhotoUrl && (
            <div className="mt-4">
              <img 
                src={entry.signedPhotoUrl} 
                alt={entry.photo_filename 
                  ? `Photo for journal entry: ${entry.photo_filename}` 
                  : `Photo attached to journal entry from ${formatTime(entry.created_at)}`
                } 
                className="rounded-xl max-w-full h-auto max-h-64 object-contain shadow-md" 
                loading="lazy"
                onError={(e) => {
                  console.error('Image failed to load:', entry.signedPhotoUrl);
                  e.currentTarget.style.display = 'none';
                }}
              /> 
            </div>
          )}
          
          {/* Affirmation Section */}
          {entry.affirmation_text && (
            <div className="mt-4 bg-gradient-to-r from-zen-mint-50 to-zen-peach-50 dark:from-gray-700/50 dark:to-gray-600/50 p-3 rounded-xl">
              <div className="flex items-start space-x-2 relative">
                <Sparkles className="w-4 h-4 text-zen-peach-500 mt-1 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm text-zen-sage-700 dark:text-gray-300 italic">
                    {entry.affirmation_text}
                  </p>
                  {entry.affirmation_source && (
                    <span className="text-xs text-zen-sage-500 dark:text-gray-400 mt-1 inline-block">
                      {entry.affirmation_source === 'ai' ? 'AI-generated' : 'Zeno\'s wisdom'}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <VoiceButton
                    isGenerating={isGeneratingSpeech}
                    isPlaying={isSpeechPlaying} 
                    isProcessing={isProcessingAudio}
                    onPlay={handlePlayAffirmation}
                    onStop={handleStopAffirmation}
                    size="sm"
                    isPremiumUser={isPremiumUser}
                    onUpsellTrigger={() => onUpsellTrigger(
                      'Voice Affirmations', 
                      'Listen to your saved affirmations with natural-sounding voice'
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {!isExpanded && needsExpansion && (
            <button
              onClick={() => onToggleExpand(entry.id)}
              className="mt-3 text-zen-mint-600 hover:text-zen-mint-700 text-sm font-medium"
              aria-label="Read more of this entry"
            >
              Read more...
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default JournalEntryCard;