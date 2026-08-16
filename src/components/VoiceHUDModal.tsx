import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  Sparkles,
  Zap,
  RotateCcw,
  AudioWaveform as Waveform,
} from 'lucide-react';
import { generateGeminiResponse, convertTextToSpeech } from '../services/geminiService';

interface VoiceHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  apiKey?: string;
  ttsVoice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  systemInstruction?: string;
}

export const VoiceHUDModal: React.FC<VoiceHUDModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  apiKey,
  ttsVoice = 'Kore',
  systemInstruction,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Voice Link Ready. Tap to speak.');

  const recognitionRef = useRef<unknown>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopAll();
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening to your voice command...');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setUserTranscript(final || interim);

        if (final) {
          processVoiceInput(final);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error', e);
        setIsListening(false);
        setStatusMessage('Mic inactive. Tap orb to listen again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      startListening();
    } else {
      setStatusMessage('Web Speech API not supported in this browser. Please use text mode.');
    }

    return () => {
      stopAll();
    };
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current && !isThinking && !isSpeaking) {
      try {
        (recognitionRef.current as any).start();
      } catch (e) {
        console.warn('Recognition start caught', e);
      }
    }
  };

  const stopAll = () => {
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as any).abort();
      } catch {}
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
  };

  const processVoiceInput = async (promptText: string) => {
    if (!promptText.trim()) return;

    setIsListening(false);
    setIsThinking(true);
    setStatusMessage('Neural processing via Gemini...');

    try {
      const result = await generateGeminiResponse({
        model: currentModel || 'gemini-3.7-flash',
        prompt: promptText,
        apiKey,
        systemInstruction: systemInstruction || 'You are Aether AI in live voice conversation mode. Provide concise, friendly, spoken responses (1-3 sentences).',
      });

      setAiTranscript(result.text);
      setIsThinking(false);
      setIsSpeaking(true);
      setStatusMessage('Transmitting audio response...');

      // Speak response
      await speakResponse(result.text);
    } catch (err: unknown) {
      setIsThinking(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setAiTranscript(`Voice connection issue: ${errMsg}`);
      setStatusMessage('Error processing request.');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      const res = await convertTextToSpeech(text, ttsVoice, apiKey);

      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          setStatusMessage('Audio transmission completed. Tap orb to speak again.');
        };
        audio.onerror = () => {
          fallbackSpeak(res.cleanText || text);
        };
        try {
          await audio.play();
        } catch {
          fallbackSpeak(res.cleanText || text);
        }
      } else {
        fallbackSpeak(res.cleanText || text);
      }
    } catch {
      fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (rawText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const sanitized = rawText
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#`_~>|]/g, '')
        .trim()
        .slice(0, 1000);

      const utterance = new SpeechSynthesisUtterance(sanitized);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.default)
      ) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.05;
      utterance.lang = 'en-US';
      utterance.onend = () => {
        setIsSpeaking(false);
        setStatusMessage('Audio transmission completed. Tap orb to speak again.');
      };
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl glass-card border border-white/15 p-6 md:p-8 flex flex-col items-center text-center shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white glass-card hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-white/10 text-xs hud-text font-bold text-sky-300 tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>REAL-TIME HUD VOICE MATRIX</span>
        </div>

        {/* 3D-Styled Animated Glowing AI Voice Orb */}
        <div className="relative my-6 flex items-center justify-center">
          {/* Outer glow rings */}
          <div
            className={`absolute w-52 h-52 rounded-full border border-sky-400/30 transition-all duration-700 ${
              isListening
                ? 'scale-125 border-sky-400/60 animate-ping'
                : isSpeaking
                ? 'scale-110 border-purple-400/60 animate-pulse'
                : 'scale-100 opacity-30'
            }`}
          />
          <div
            className={`absolute w-40 h-40 rounded-full bg-gradient-to-tr from-sky-500/20 to-purple-600/20 blur-xl transition-all duration-500 ${
              isListening ? 'scale-150 opacity-90' : isSpeaking ? 'scale-130 opacity-80' : 'opacity-40'
            }`}
          />

          {/* Central Interactive Orb Button */}
          <button
            onClick={() => {
              if (isListening) {
                stopAll();
              } else {
                startListening();
              }
            }}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-2xl ${
              isListening
                ? 'accent-gradient text-white scale-105 shadow-[0_0_60px_#0ea5e9]'
                : isSpeaking
                ? 'bg-gradient-to-tr from-purple-500 via-indigo-600 to-sky-500 text-white shadow-[0_0_50px_#a855f7]'
                : isThinking
                ? 'bg-slate-900 border-2 border-purple-400 text-purple-300 animate-spin'
                : 'glass-card border-2 border-sky-500/40 text-sky-300 hover:border-sky-300 hover:scale-105'
            }`}
          >
            {isThinking ? (
              <Zap className="w-10 h-10 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-10 h-10 animate-bounce" />
            ) : isSpeaking ? (
              <Volume2 className="w-10 h-10 animate-pulse" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
            <span className="text-[10px] hud-text font-bold tracking-widest mt-1">
              {isListening ? 'LISTENING' : isSpeaking ? 'SPEAKING' : isThinking ? 'THINKING' : 'TAP MIC'}
            </span>
          </button>
        </div>

        {/* Status Message */}
        <p className="text-xs hud-text text-sky-300/90 mb-4 h-5">{statusMessage}</p>

        {/* Live Audio Waveform Simulation */}
        <div className="flex items-center justify-center gap-1.5 h-8 mb-4">
          {[40, 75, 90, 60, 100, 45, 80, 65, 95, 50, 70, 85].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isListening
                  ? 'bg-sky-400'
                  : isSpeaking
                  ? 'bg-purple-400'
                  : 'bg-white/10'
              }`}
              style={{
                height: isListening || isSpeaking ? `${Math.max(15, (h * (isListening ? 0.9 : 0.7)))}%` : '15%',
              }}
            />
          ))}
        </div>

        {/* Live Transcript Logs */}
        <div className="w-full glass-panel rounded-2xl border border-white/10 p-4 text-left space-y-2.5 max-h-44 overflow-y-auto">
          {userTranscript && (
            <div className="text-xs">
              <span className="text-sky-400 hud-text font-bold uppercase tracking-wider block mb-0.5">
                You:
              </span>
              <p className="text-slate-200 font-sans">{userTranscript}</p>
            </div>
          )}
          {aiTranscript && (
            <div className="text-xs pt-2 border-t border-white/10">
              <span className="text-purple-400 hud-text font-bold uppercase tracking-wider block mb-0.5">
                Aether AI:
              </span>
              <p className="text-slate-300 font-sans">{aiTranscript}</p>
            </div>
          )}
          {!userTranscript && !aiTranscript && (
            <p className="text-slate-400 text-xs font-mono text-center py-2">
              Speak naturally. Aether AI will transcribe and respond with low latency.
            </p>
          )}
        </div>

        {/* Footer controls */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              setUserTranscript('');
              setAiTranscript('');
              startListening();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-card hover:bg-white/10 text-xs hud-text text-slate-300 hover:text-sky-200 border border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET LOOP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
