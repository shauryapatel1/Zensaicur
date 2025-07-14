import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BarChart3, 
  BookOpen,
  Download
} from 'lucide-react';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import Logo from './Logo';
import { MoodLevel } from '../types';
import { HISTORY } from '../constants/uiStrings';

// Import history components
import HistoryFilters from './history/HistoryFilters';
import MoodStatsOverview from './history/MoodStatsOverview';
import JournalEntryCard from './history/JournalEntryCard';
import DateGroupHeader from './history/DateGroupHeader';
import HistoryPagination from './history/HistoryPagination';
import AdvancedAnalytics from './history/AdvancedAnalytics';
import PremiumHistoryLimit from './history/PremiumHistoryLimit';
import EmptyState from './history/EmptyState';

interface MoodHistoryScreenProps {
  onBack: () => void;
  profile: any;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  photo_url: string | null;
  photo_filename: string | null;
  signedPhotoUrl?: string;
  affirmation_text?: string | null;
  affirmation_audio_url?: string | null;
  signedAudioUrl?: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupedEntries {
  [date: string]: JournalEntry[];
}

export default function MoodHistoryScreen({ onBack, profile }: MoodHistoryScreenProps) {
  const { user } = useAuth();
  const { entries, isLoading, error, deleteEntry, updateEntry, refreshData } = useJournal();
  const { isPremium, isTrialActive, showUpsellModal } = usePremium();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<MoodLevel | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ENTRIES_PER_PAGE = 10;

  // Refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Helper functions
  const getMoodLevel = (moodString: string): MoodLevel => {
    const moodMap: Record<string, MoodLevel> = {
      'struggling': 1,
      'low': 2,
      'neutral': 3,
      'good': 4,
      'amazing': 5
    };
    return moodMap[moodString] || 3;
  };

  const getDateKey = (dateString: string) => {
    return new Date(dateString).toDateString();
  };

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesMood = filterMood === 'all' || getMoodLevel(entry.mood) === filterMood;
      const matchesSearch = searchTerm === '' || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.title && entry.title.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesMood && matchesSearch;
    });
  }, [entries, filterMood, searchTerm]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEntries, sortOrder]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    return sortedEntries.reduce((groups: GroupedEntries, entry) => {
      const dateKey = getDateKey(entry.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {});
  }, [sortedEntries]);

  // Calculate mood statistics
  const moodStats = useMemo(() => {
    const stats: Record<MoodLevel, { level: MoodLevel, count: number, percentage: number }> = {
      1: { level: 1, count: 0, percentage: 0 },
      2: { level: 2, count: 0, percentage: 0 },
      3: { level: 3, count: 0, percentage: 0 },
      4: { level: 4, count: 0, percentage: 0 },
      5: { level: 5, count: 0, percentage: 0 }
    };
    
    // Count occurrences of each mood
    entries.forEach(entry => {
      const moodLevel = getMoodLevel(entry.mood);
      stats[moodLevel].count++;
    });
    
    // Calculate percentages
    const totalEntries = entries.length;
    if (totalEntries > 0) {
      Object.values(stats).forEach(stat => {
        stat.percentage = (stat.count / totalEntries) * 100;
      });
    }
    
    return Object.values(stats);
  }, [entries]);

  // Pagination
  const groupedDates = Object.keys(groupedEntries);
  const totalPages = Math.ceil(groupedDates.length / ENTRIES_PER_PAGE);
  const paginatedDates = groupedDates.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );

  // Event handlers
  const handleEditEntry = (entry: JournalEntry) => {
    if (!isPremium && !isTrialActive) {
      showUpsellModal('Edit Entries', 'Edit and update your journal entries with premium access.');
      return;
    }
    setEditingEntry(entry);
    setSelectedEntry(null);
  };

  const handleSaveEdit = async (entryId: string, updates: Partial<JournalEntry>) => {
    if (!editingEntry) return;
    
    try {
      await updateEntry(entryId, updates);
      setEditingEntry(null);
      // Refresh data to get updated entries
      refreshData();
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      try {
        await deleteEntry(entryId);
        setSelectedEntry(null);
        setExpandedEntry(null);
        // Refresh data to get updated entries
        refreshData();
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterMood('all');
    setCurrentPage(1);
  };

  const handleExportData = () => {
    if (!isPremium && !isTrialActive) {
      showUpsellModal('Export Data', 'Export your journal entries and analytics with premium access.');
      return;
    }
    
    const dataStr = JSON.stringify(filteredEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-entries-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Determine if we should show the premium limit message
  const showHistoryLimitMessage = !isPremium && !isTrialActive;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 dark:text-gray-300 font-medium">Loading your journal history...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load journal entries</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-zen-mint-400 text-white rounded-lg hover:bg-zen-mint-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border-b border-white/20 dark:border-gray-600/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 dark:text-gray-400 hover:text-zen-sage-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-300"
              aria-label="Go back to previous screen"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="mr-1" />
              <div>
                <h1 className="font-display font-bold text-zen-sage-800 dark:text-gray-200 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-zen-mint-500" aria-hidden="true" />
                  {HISTORY.TITLE}
                </h1>
                <p className="text-xs text-zen-sage-600 dark:text-gray-400">
                  {filteredEntries.length} of {entries.length} entries
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">            
            <button
              onClick={handleExportData}
              className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 text-zen-sage-600 dark:text-gray-400 hover:bg-zen-mint-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Export journal data"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Premium History Limit Message */}
        <PremiumHistoryLimit
          showHistoryLimitMessage={showHistoryLimitMessage}
          onUpgrade={() => showUpsellModal('Premium Access', 'Get unlimited access to your complete journal history and all premium features.')}
        />

        {/* Mood Statistics Overview */}
        <MoodStatsOverview moodStats={moodStats} />

        {/* Search and Filters */}
        <HistoryFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterMood={filterMood}
          onFilterMoodChange={setFilterMood}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onClearFilters={clearFilters}
        />

        {/* Entries Timeline */}
        <div className="space-y-6">
          {paginatedDates.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              filterMood={filterMood}
              onClearFilters={clearFilters}
            />
          ) : (
            paginatedDates.map((dateKey, dateIndex) => {
              const dayEntries = groupedEntries[dateKey];
              
              return (
                <motion.div
                  key={dateKey}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dateIndex * 0.1 }}
                >
                  {/* Date Header */}
                  <DateGroupHeader
                    date={dateKey}
                    entries={dayEntries}
                    index={dateIndex}
                  />

                  {/* Entries for this date */}
                  <div className="space-y-4 ml-8">
                    {dayEntries.map((entry, entryIndex) => (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        isExpanded={expandedEntry === entry.id}
                        isEditing={editingEntry?.id === entry.id}
                        onToggleExpand={toggleEntryExpansion}
                        onEdit={handleEditEntry}
                        onDelete={handleDeleteEntry}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setEditingEntry(null)}
                        index={entryIndex}
                        delay={(dateIndex * 0.1) + (entryIndex * 0.05)}
                        isPremiumUser={isPremium || isTrialActive}
                        onUpsellTrigger={showUpsellModal}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <HistoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal content */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Entry Modal */}
      <AnimatePresence>
        {editingEntry && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Modal content */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}