import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// --- Enums for type safety ---
export enum ZenoStatus {
  Loading = 'loading',
  Cooldown = 'cooldown',
  Available = 'available',
  InSession = 'in_session',
  PostSession = 'post_session',
  Error = 'error',
}

export enum ZenoMicroTaskType {
  Gratitude = 'gratitude',
  Breathing = 'breathing',
  MoodPoll = 'mood_poll',
}

export enum ZenoMicroTaskState {
  Pending = 'pending',
  Completed = 'completed',
  Skipped = 'skipped',
}

// --- State interface ---
export interface ZenoState {
  status: ZenoStatus;
  cooldownEndsAt: number | null;
  emergencySessionsRemaining: number;
  sessionId: string | null;
  sessionGoal: string | null;
  microTask: {
    type: ZenoMicroTaskType | null;
    summary: string | null;
    state: ZenoMicroTaskState;
  };
  error: string | null;
}

const initialState: ZenoState = {
  status: ZenoStatus.Loading,
  cooldownEndsAt: null,
  emergencySessionsRemaining: 1,
  sessionId: null,
  sessionGoal: null,
  microTask: {
    type: null,
    summary: null,
    state: ZenoMicroTaskState.Pending,
  },
  error: null,
};

// --- Actions ---
type Action =
  | { type: 'SET_STATUS'; status: ZenoStatus }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'INITIALIZE'; cooldownEndsAt: number | null; emergencySessionsRemaining: number }
  | { type: 'START_SESSION'; sessionId: string; sessionGoal: string }
  | { type: 'END_SESSION'; aiSummary: string; microTaskType: ZenoMicroTaskType; cooldownEndsAt: number }
  | { type: 'COMPLETE_MICROTASK'; microTaskState: ZenoMicroTaskState }
  | { type: 'RESET' }
  | { type: 'USE_EMERGENCY'; sessionId: string; emergencySessionsRemaining: number };

function reducer(state: ZenoState, action: Action): ZenoState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_ERROR':
      return { ...state, error: action.error, status: action.error ? ZenoStatus.Error : state.status };
    case 'INITIALIZE':
      return {
        ...state,
        status: action.cooldownEndsAt && action.cooldownEndsAt > Date.now() ? ZenoStatus.Cooldown : ZenoStatus.Available,
        cooldownEndsAt: action.cooldownEndsAt,
        emergencySessionsRemaining: action.emergencySessionsRemaining,
        error: null,
      };
    case 'START_SESSION':
      return {
        ...state,
        status: ZenoStatus.InSession,
        sessionId: action.sessionId,
        sessionGoal: action.sessionGoal,
        error: null,
      };
    case 'END_SESSION':
      return {
        ...state,
        status: ZenoStatus.PostSession,
        microTask: {
          ...state.microTask,
          type: action.microTaskType,
          summary: action.aiSummary,
          state: ZenoMicroTaskState.Pending,
        },
        cooldownEndsAt: action.cooldownEndsAt,
        error: null,
      };
    case 'COMPLETE_MICROTASK':
      return {
        ...state,
        microTask: {
          ...state.microTask,
          state: action.microTaskState,
        },
      };
    case 'RESET':
      return {
        ...initialState,
        status: ZenoStatus.Cooldown,
        cooldownEndsAt: state.cooldownEndsAt,
        emergencySessionsRemaining: state.emergencySessionsRemaining,
      };
    case 'USE_EMERGENCY':
      return {
        ...state,
        status: ZenoStatus.InSession,
        sessionId: action.sessionId,
        emergencySessionsRemaining: action.emergencySessionsRemaining,
        error: null,
      };
    default:
      return state;
  }
}

// --- Context ---
const ZenoContext = createContext<{
  state: ZenoState;
  initializeZeno: () => Promise<void>;
  startSession: (goal: string) => Promise<void>;
  endSession: (durationSeconds: number) => Promise<void>;
  completeMicroTask: (response: object) => Promise<void>;
  finishAndReturnToDashboard: () => void;
  useEmergencySession: () => Promise<void>;
  clearError: () => void;
} | undefined>(undefined);

// --- Provider ---
export const ZenoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- Mocked API calls for MVP scaffolding ---
  const mockApi = {
    getStatus: async () => ({ cooldownEndsAt: null, emergencySessionsRemaining: 1 }),
    startSession: async (goal: string) => ({ sessionId: 'mock-session-id' }),
    endSession: async (durationSeconds: number) => ({ aiSummary: 'Mock summary', microTaskType: ZenoMicroTaskType.Gratitude, newCooldownEndsAt: Date.now() + 2 * 60 * 60 * 1000 }),
    completeMicroTask: async (response: object) => ({ success: true }),
    useEmergency: async () => ({ sessionId: 'mock-emergency-session-id', emergencySessionsRemaining: 0 }),
  };

  // --- Actions ---
  const initializeZeno = useCallback(async () => {
    dispatch({ type: 'SET_STATUS', status: ZenoStatus.Loading });
    try {
      const res = await mockApi.getStatus();
      dispatch({ type: 'INITIALIZE', cooldownEndsAt: res.cooldownEndsAt, emergencySessionsRemaining: res.emergencySessionsRemaining });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message || 'Failed to load Zeno status.' });
    }
  }, []);

  const startSession = useCallback(async (goal: string) => {
    try {
      const res = await mockApi.startSession(goal);
      dispatch({ type: 'START_SESSION', sessionId: res.sessionId, sessionGoal: goal });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message || 'Failed to start session.' });
    }
  }, []);

  const endSession = useCallback(async (durationSeconds: number) => {
    try {
      const res = await mockApi.endSession(durationSeconds);
      dispatch({ type: 'END_SESSION', aiSummary: res.aiSummary, microTaskType: res.microTaskType, cooldownEndsAt: res.newCooldownEndsAt });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message || 'Failed to end session.' });
    }
  }, []);

  const completeMicroTask = useCallback(async (response: object) => {
    try {
      await mockApi.completeMicroTask(response);
      dispatch({ type: 'COMPLETE_MICROTASK', microTaskState: ZenoMicroTaskState.Completed });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message || 'Failed to complete micro-task.' });
    }
  }, []);

  const finishAndReturnToDashboard = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const useEmergencySession = useCallback(async () => {
    try {
      const res = await mockApi.useEmergency();
      dispatch({ type: 'USE_EMERGENCY', sessionId: res.sessionId, emergencySessionsRemaining: res.emergencySessionsRemaining });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e.message || 'Failed to start emergency session.' });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
  }, []);

  // --- Auto-initialize on mount ---
  useEffect(() => {
    initializeZeno();
  }, [initializeZeno]);

  return (
    <ZenoContext.Provider
      value={{
        state,
        initializeZeno,
        startSession,
        endSession,
        completeMicroTask,
        finishAndReturnToDashboard,
        useEmergencySession,
        clearError,
      }}
    >
      {children}
    </ZenoContext.Provider>
  );
};

// --- Hook ---
export function useZeno() {
  const ctx = useContext(ZenoContext);
  if (!ctx) throw new Error('useZeno must be used within a ZenoProvider');
  return ctx;
} 