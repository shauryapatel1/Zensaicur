import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  Heart,
  BookOpen,
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useJournal } from '../hooks/useJournal';
import { useAuth } from '../contexts/AuthContext';
import LottieAvatar from './LottieAvatar';
import MoodSelector from './MoodSelector';
import { MoodLevel } from '../types';
import { moods } from '../data/moods';
import DiaryExport from './history/DiaryExport';

interface JournalHistoryScreenProps {
  onBack: () => void;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  signedPhotoUrl?: string;
  photo_filename: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupedEntries {
  [date: string]: JournalEntry[];
}

export default function JournalHistoryScreen({ onBack }: JournalHistoryScreenProps) {
  const { user } = useAuth();
  const { entries, isLoading, error, deleteEntry, updateEntry } = useJournal();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<MoodLevel | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState<MoodLevel>(3);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showDiaryExport, setShowDiaryExport] = useState(false);
  const [diaryTheme, setDiaryTheme] = useState('Classic');
  const [coverTitle, setCoverTitle] = useState('My Zensai Diary');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  const ENTRIES_PER_PAGE = 10;

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

  const getMoodString = (level: MoodLevel): string => {
    const levelMap: Record<MoodLevel, string> = {
      1: 'struggling',
      2: 'low',
      3: 'neutral',
      4: 'good',
      5: 'amazing'
    };
    return levelMap[level];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();
    
    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === yesterdayOnly) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDateKey = (dateString: string) => {
    return new Date(dateString).toDateString();
  };

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesMood = filterMood === 'all' || getMoodLevel(entry.mood) === filterMood;
      const matchesSearch = searchTerm === '' || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase());
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

  // Pagination
  const groupedDates = Object.keys(groupedEntries);
  const totalPages = Math.ceil(groupedDates.length / ENTRIES_PER_PAGE);
  const paginatedDates = groupedDates.slice(
    (currentPage - 1) * ENTRIES_PER_PAGE,
    currentPage * ENTRIES_PER_PAGE
  );

  // Event handlers
  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
    setEditMood(getMoodLevel(entry.mood));
    setSelectedEntry(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      const result = await updateEntry(editingEntry.id, editContent, editMood);
      if (result.success) {
        setEditingEntry(null);
        setEditContent('');
      }
    } catch (err) {
      console.error('Failed to update entry:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      try {
        const result = await deleteEntry(entryId);
        if (result.success) {
          setSelectedEntry(null);
          setExpandedEntry(null);
        }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-zen-mint-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zen-sage-600 font-medium">Loading your journal history...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zen-mint-50 via-zen-cream-50 to-zen-lavender-50">
      {/* Header */}
      <motion.header
        className="relative z-10 p-4 bg-white/30 backdrop-blur-sm border-b border-white/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-zen-sage-600 hover:text-zen-sage-800 hover:bg-white/50 rounded-full transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Logo with Zeno */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg bg-white/20 backdrop-blur-sm">
                <LottieAvatar mood={3} size="sm" variant="journaling" animate={false} />
              </div>
              <div>
                <h1 className="font-display font-bold text-zen-sage-800 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-zen-mint-500" />
                  Journal History
                </h1>
                <p className="text-xs text-zen-sage-600">
                  {filteredEntries.length} of {entries.length} entries
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 px-3 py-2 bg-zen-mint-100 rounded-full">
              <Calendar className="w-4 h-4 text-zen-mint-600" />
              <span className="text-zen-sage-700 font-medium">
                {Object.keys(groupedEntries).length} days
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-zen-peach-100 rounded-full">
              <TrendingUp className="w-4 h-4 text-zen-peach-600" />
              <span className="text-zen-sage-700 font-medium">
                {entries.length} total entries
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowDiaryExport(true)}
            className="px-4 py-2 bg-zen-mint-500 text-white rounded-lg shadow hover:bg-zen-mint-600 transition-all duration-300"
          >
            Export Diary
          </button>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search and Filters */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zen-sage-400" />
              <input
                type="text"
                placeholder="Search your journal entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-zen-sage-200 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent bg-white/70 text-zen-sage-800 placeholder-zen-sage-400"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 text-zen-sage-600 hover:text-zen-sage-800 hover:bg-zen-sage-100 rounded-xl transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {(searchTerm || filterMood !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-zen-mint-600 hover:text-zen-mint-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="mt-4 pt-4 border-t border-zen-sage-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mood Filter */}
                    <div>
                      <label className="block text-sm font-medium text-zen-sage-700 mb-2">
                        Filter by mood
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setFilterMood('all')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            filterMood === 'all'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 text-zen-sage-600 hover:bg-zen-sage-200'
                          }`}
                        >
                          All Moods
                        </button>
                        <div className="hidden sm:block">
                          <MoodSelector
                            selectedMood={filterMood === 'all' ? undefined : filterMood}
                            onMoodSelect={(mood) => setFilterMood(mood)}
                            size="sm"
                            layout="horizontal"
                            showLabels={false}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-zen-sage-700 mb-2">
                        Sort order
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSortOrder('newest')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            sortOrder === 'newest'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 text-zen-sage-600 hover:bg-zen-sage-200'
                          }`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => setSortOrder('oldest')}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            sortOrder === 'oldest'
                              ? 'bg-zen-mint-400 text-white'
                              : 'bg-zen-sage-100 text-zen-sage-600 hover:bg-zen-sage-200'
                          }`}
                        >
                          Oldest First
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Entries Timeline */}
        <div className="space-y-6">
          {paginatedDates.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <LottieAvatar mood={3} size="lg" variant="idle" />
              <h3 className="text-xl font-display font-semibold text-zen-sage-800 mt-6 mb-2">
                No entries found
              </h3>
              <p className="text-zen-sage-600 mb-4">
                {searchTerm || filterMood !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Start journaling to see your entries here!'
                }
              </p>
              {(searchTerm || filterMood !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          ) : (
            paginatedDates.map((dateKey, dateIndex) => {
              const dayEntries = groupedEntries[dateKey];
              const averageMood = dayEntries.reduce((sum, entry) => 
                sum + getMoodLevel(entry.mood), 0
              ) / dayEntries.length;
              const roundedMood = Math.round(averageMood) as MoodLevel;
              const dayMoodData = moods.find(m => m.level === roundedMood);

              return (
                <motion.div
                  key={dateKey}
                  className="relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dateIndex * 0.1 }}
                >
                  {/* Date Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-white/20">
                      <div className="text-2xl">{dayMoodData?.emoji}</div>
                      <div>
                        <h3 className="font-display font-bold text-zen-sage-800">
                          {formatDate(dayEntries[0].created_at)}
                        </h3>
                        <p className="text-sm text-zen-sage-600">
                          {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'} • 
                          Average mood: {dayMoodData?.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-zen-sage-200 to-transparent" />
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-4 ml-8">
                    {dayEntries.map((entry, entryIndex) => {
                      const entryMood = getMoodLevel(entry.mood);
                      const entryMoodData = moods.find(m => m.level === entryMood);
                      const isExpanded = expandedEntry === entry.id;
                      const previewLength = 150;
                      const needsExpansion = entry.content.length > previewLength;

                      return (
                        <motion.div
                          key={entry.id}
                          className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (dateIndex * 0.1) + (entryIndex * 0.05) }}
                        >
                          {/* Entry Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-xl">{entryMoodData?.emoji}</div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-zen-sage-400" />
                                  <span className="text-sm font-medium text-zen-sage-600">
                                    {formatTime(entry.created_at)}
                                  </span>
                                  <span className="text-xs text-zen-sage-400">•</span>
                                  <span className="text-sm text-zen-sage-600">
                                    {entryMoodData?.label}
                                  </span>
                                </div>
                                <p className="text-xs text-zen-sage-500 mt-1">
                                  {entry.content.split(' ').length} words
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedEntry(entry)}
                                className="p-2 text-zen-sage-500 hover:text-zen-mint-600 hover:bg-zen-mint-100 rounded-lg transition-all"
                                title="View full entry"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="p-2 text-zen-sage-500 hover:text-zen-mint-600 hover:bg-zen-mint-100 rounded-lg transition-all"
                                title="Edit entry"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 text-zen-sage-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Entry Content */}
                          <div className="text-zen-sage-700 leading-relaxed">
                            <p className="whitespace-pre-wrap">
                              {isExpanded || !needsExpansion
                                ? entry.content
                                : `${entry.content.substring(0, previewLength)}...`
                              }
                            </p>
                            
                            {/* Photo Display */}
                            {entry.signedPhotoUrl && (
                              <div className="mt-4 max-w-md">
                                <img
                                  src={entry.signedPhotoUrl}
                                  alt={entry.photo_filename || 'Journal photo'}
                                  className="w-full max-w-md rounded-xl shadow-md object-contain"
                                  style={{ maxHeight: '200px' }}
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error('Image failed to load:', entry.signedPhotoUrl);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {needsExpansion && (
                              <button
                                onClick={() => toggleEntryExpansion(entry.id)}
                                className="mt-3 text-zen-mint-600 hover:text-zen-mint-700 text-sm font-medium flex items-center space-x-1"
                              >
                                <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="flex justify-center items-center space-x-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white/80 text-zen-sage-600 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl font-medium transition-all ${
                    currentPage === page
                      ? 'bg-zen-mint-400 text-white'
                      : 'bg-white/80 text-zen-sage-600 hover:bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white/80 text-zen-sage-600 rounded-xl hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </motion.div>
        )}
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
              className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {moods.find(m => m.level === getMoodLevel(selectedEntry.mood))?.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-zen-sage-800">
                      {formatDate(selectedEntry.created_at)}
                    </h2>
                    <p className="text-zen-sage-600">
                      {formatTime(selectedEntry.created_at)} • 
                      {moods.find(m => m.level === getMoodLevel(selectedEntry.mood))?.label}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-zen-sage-400 hover:text-zen-sage-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="prose prose-zen max-w-none mb-6">
                <p className="text-zen-sage-700 leading-relaxed whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
                
                {/* Photo Display in Modal */}
                {selectedEntry.signedPhotoUrl && (
                  <div className="mt-6 max-w-full">
                    <img
                      src={selectedEntry.signedPhotoUrl}
                      alt={selectedEntry.photo_filename || 'Journal photo'}
                      className="w-full rounded-xl shadow-lg object-contain"
                      style={{ maxHeight: '300px' }}
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', selectedEntry.signedPhotoUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-zen-sage-200">
                <button
                  onClick={() => handleEditEntry(selectedEntry)}
                  className="flex items-center space-x-2 px-4 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-400 text-white rounded-xl hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
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
              className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-display font-bold text-zen-sage-800 mb-6">
                Edit Journal Entry
              </h2>
              
              {/* Mood Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zen-sage-700 mb-3">
                  How were you feeling?
                </label>
                <MoodSelector
                  selectedMood={editMood}
                  onMoodSelect={setEditMood}
                  size="md"
                  layout="horizontal"
                />
              </div>
              
              {/* Content Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zen-sage-700 mb-3">
                  Your thoughts
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-48 p-4 border border-zen-sage-200 rounded-2xl focus:ring-2 focus:ring-zen-mint-400 focus:border-transparent resize-none text-zen-sage-800 leading-relaxed"
                  placeholder="Edit your journal entry..."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-zen-sage-500">
                    {editContent.length} characters • {editContent.split(' ').filter(word => word.length > 0).length} words
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="px-6 py-2 text-zen-sage-600 hover:text-zen-sage-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="flex items-center space-x-2 px-6 py-2 bg-zen-mint-400 text-white rounded-xl hover:bg-zen-mint-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Diary Export Modal */}
      {showDiaryExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full relative">
            <button
              className="absolute top-2 right-2 text-zen-sage-500 hover:text-zen-sage-800"
              onClick={() => setShowDiaryExport(false)}
            >
              <span className="sr-only">Close</span>
              &times;
            </button>
            <h2 className="font-display text-xl font-bold mb-4">Preview & Export Diary</h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block mb-2 font-medium">Theme</label>
                <select
                  className="w-full p-2 border rounded mb-4"
                  value={diaryTheme}
                  onChange={e => setDiaryTheme(e.target.value)}
                >
                  <option value="Classic">Classic</option>
                  <option value="Night">Night</option>
                  <option value="Mint">Mint</option>
                </select>
                <label className="block mb-2 font-medium">Cover Title</label>
                <input
                  className="w-full p-2 border rounded mb-4"
                  value={coverTitle}
                  onChange={e => setCoverTitle(e.target.value)}
                />
                <label className="block mb-2 font-medium">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full mb-4"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setCoverImage(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <DiaryExport
                  entries={sortedEntries}
                  theme={diaryTheme}
                  coverTitle={coverTitle}
                  coverImage={coverImage}
                />
              </div>
            </div>
            {/* PDF export button will be added later */}
          </div>
        </div>
      )}
    </div>
  );
}