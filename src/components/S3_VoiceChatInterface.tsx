import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Loader2, Volume2, AlertTriangle } from 'lucide-react';
// import ZenoAvatar from './ZenoAvatar'; // Placeholder for avatar component
// import ChatLog from './ChatLog'; // Placeholder for chat log component
import { transcribeAudioWithElevenLabs } from '../lib/elevenlabs';
import { getGeminiResponse } from '../lib/gemini';
import { synthesizeSpeechWithElevenLabs } from '../lib/elevenlabs';

// State types
export type S3State = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface ChatTurn {
  role: 'user' | 'zeno';
  text: string;
}

interface S3Props {
  sessionId: string;
  onSessionEnd: () => void;
  sessionDuration?: number; // in seconds, default 120
}

const DEFAULT_SESSION_DURATION = 120;

const S3_VoiceChatInterface: React.FC<S3Props> = ({ sessionId, onSessionEnd, sessionDuration = DEFAULT_SESSION_DURATION }) => {
  // State machine
  const [state, setState] = useState<S3State>('idle');
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(sessionDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Timer logic ---
  useEffect(() => {
    if (state === 'idle' || state === 'listening' || state === 'thinking' || state === 'speaking') {
      if (timer > 0 && !timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimer(t => {
            if (t <= 1) {
              clearInterval(timerRef.current!);
              timerRef.current = null;
              onSessionEnd();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state, timer, onSessionEnd]);

  // --- State machine logic ---
  const handleMicPress = useCallback(() => {
    if (state === 'idle') {
      setState('listening');
      setTranscription(null);
      setError(null);
      // Start recording audio here
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorder.start();
        })
        .catch(() => {
          setError('Microphone access denied.');
          setState('error');
        });
    }
  }, [state]);

  const handleMicRelease = useCallback(async () => {
    if (state === 'listening') {
      setState('thinking');
      // Stop recording and send audio to STT
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
            const sttResult = await transcribeAudioWithElevenLabs(audioBlob);
            if (!sttResult) {
              setError("Didn't catch that, try again.");
              setState('idle');
              return;
            }
            setConversation(prev => [...prev, { role: 'user', text: sttResult }]);
            // Call Gemini API for AI response
            const aiResponse = await getGeminiResponse([...conversation, { role: 'user', text: sttResult }]);
            setConversation(prev => [...prev, { role: 'zeno', text: aiResponse }]);
            setState('speaking');
            // ElevenLabs TTS integration
            try {
              const ttsAudioBlob = await synthesizeSpeechWithElevenLabs(aiResponse);
              const audioUrl = URL.createObjectURL(ttsAudioBlob);
              setIsAudioPlaying(true);
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
              } else {
                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                audio.play();
                audio.onended = () => {
                  setIsAudioPlaying(false);
                  setState('idle');
                  URL.revokeObjectURL(audioUrl);
                };
              }
            } catch (ttsErr: any) {
              setError(ttsErr.message || 'Failed to play Zeno\'s voice.');
              setIsAudioPlaying(false);
              setState('error');
            }
            // If audioRef.onended is not set (e.g., if using existing ref), fallback:
            if (audioRef.current) {
              audioRef.current.onended = () => {
                setIsAudioPlaying(false);
                setState('idle');
                if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
              };
            }
          } catch (e: any) {
            setError(e.message || 'Something went wrong.');
            setState('error');
          }
        };
        mediaRecorder.stop();
      }
    }
  }, [state, conversation]);

  const handleRetry = () => {
    setError(null);
    setState('idle');
  };

  // --- Mocked integrations for scaffold ---
  // async function mockTTS(text: string) {
  //   return new Promise<void>(resolve => setTimeout(resolve, 1800));
  // }

  // --- UI ---
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
      {/* Session Timer */}
      <div className="mb-4 text-lg font-mono text-zen-sage-700">{Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}</div>
      {/* Zeno Avatar Placeholder */}
      <div className="mb-4">
        {/* <ZenoAvatar state={isAudioPlaying ? 'speaking' : state} /> */}
        <div className={`w-24 h-24 rounded-full bg-zen-mint-200 flex items-center justify-center text-4xl ${isAudioPlaying ? 'animate-pulse' : ''}`}>
          🦊
        </div>
        <audio ref={audioRef} hidden />
      </div>
      {/* Chat Log Placeholder */}
      <div className="w-full max-w-md mb-6 h-40 overflow-y-auto bg-white/60 rounded-xl p-4 shadow-inner">
        {conversation.length === 0 && <div className="text-zen-sage-400 italic">Start talking to Zeno...</div>}
        {conversation.map((turn, idx) => (
          <div key={idx} className={`mb-2 flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-2xl ${turn.role === 'user' ? 'bg-zen-mint-300 text-right' : 'bg-zen-lavender-200 text-left'}`}>{turn.text}</div>
          </div>
        ))}
      </div>
      {/* State-specific UI */}
      {state === 'idle' && (
        <motion.button
          className="w-20 h-20 rounded-full bg-zen-mint-500 flex items-center justify-center text-white text-4xl shadow-lg hover:bg-zen-mint-600 focus:outline-none"
          whileTap={{ scale: 0.95 }}
          onMouseDown={handleMicPress}
          onMouseUp={handleMicRelease}
          onTouchStart={handleMicPress}
          onTouchEnd={handleMicRelease}
        >
          <Mic className="w-10 h-10" />
        </motion.button>
      )}
      {state === 'listening' && (
        <div className="flex flex-col items-center">
          <div className="mb-2 animate-pulse text-zen-mint-600">Listening...</div>
          <motion.button
            className="w-20 h-20 rounded-full bg-zen-mint-400 flex items-center justify-center text-white text-4xl shadow-lg focus:outline-none"
            whileTap={{ scale: 0.98 }}
            onMouseUp={handleMicRelease}
            onTouchEnd={handleMicRelease}
            disabled
          >
            <Mic className="w-10 h-10 animate-bounce" />
          </motion.button>
        </div>
      )}
      {state === 'thinking' && (
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin mb-2 text-zen-mint-500" />
          <div className="text-zen-sage-600">Thinking...</div>
        </div>
      )}
      {state === 'speaking' && (
        <div className="flex flex-col items-center">
          <Volume2 className="w-10 h-10 mb-2 text-zen-mint-500 animate-pulse" />
          <div className="text-zen-sage-600">Zeno is speaking...</div>
        </div>
      )}
      {state === 'error' && (
        <div className="flex flex-col items-center">
          <AlertTriangle className="w-10 h-10 mb-2 text-red-500" />
          <div className="text-red-600 mb-2">{error || 'Something went wrong.'}</div>
          <button
            className="px-4 py-2 bg-zen-mint-500 text-white rounded-xl shadow hover:bg-zen-mint-600"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
      {/* End Session Button */}
      <button
        className="mt-8 text-zen-sage-500 underline text-sm"
        onClick={onSessionEnd}
      >
        End Session
      </button>
    </div>
  );
};

export default S3_VoiceChatInterface; 