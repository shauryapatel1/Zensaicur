export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface Mood {
  level: MoodLevel;
  emoji: string;
  label: string;
  color: string;
  description: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: MoodLevel;
  title: string;
  content: string;
  photo_url?: string;
  photo_filename?: string;
  affirmation_text?: string;
  affirmation_audio_url?: string;
  affirmation_source?: string;
  tags: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  joinedDate: Date;
  streak: number;
  totalEntries: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}