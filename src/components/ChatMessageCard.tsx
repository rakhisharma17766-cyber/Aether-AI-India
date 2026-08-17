import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  FileDown,
  Sparkles,
  Search,
  Brain,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
  Cpu,
  FileText,
  Clock,
  Zap,
  Code2,
} from 'lucide-react';
import { Message, GeneratedImagePayload } from '../types';
import { RichMarkdownRenderer } from './RichMarkdownRenderer';
import { convertTextToSpeech } from '../services/geminiService';

interface ChatMessageCardProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  onImageZoom?: (image: GeneratedImagePayload) => void;
  onRegenerateImage?: (prompt: string) => void;
  apiKey?: string;
  ttsVoice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export const ChatMessageCard: React.FC<ChatMessageCardProps> = ({
  message,
  onRetry,
  onImageZoom,
  onRegenerateImage,
  apiKey,
  ttsVoice = 'Kore',
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Detect code blocks in response
  const codeBlockMatches = message.content.match(/```[\s\S]*?```/g);
  const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (format: 'md' | 'json') => {
    let content = '';
    let mimeType = 'text/plain';
    let filename = `aether-transmission-${message.id}`;

    if (format === 'md') {
      content = `# Aether AI Transmission\n**Timestamp:** ${new Date(message.timestamp).toLocaleString()}\n**Role:** ${message.role}\n**Model:** ${message.modelUsed || 'Gemini'}\n\n${message.content}`;
      mimeType = 'text/markdown';
      filename += '.md';
    } else {
      content = JSON.stringify(message, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTTS = async () => {
    // If already playing audio via HTMLAudioElement or Web Speech Synthesis, stop it
    if (isPlayingAudio) {
      if (currentAudio) {
        try {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setAudioLoading(false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    setAudioLoading(true);
    try {
      const res = await convertTextToSpeech(message.content, ttsVoice, apiKey);

      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        setCurrentAudio(audio);

        audio.onplay = () => {
          setIsPlayingAudio(true);
          setAudioLoading(false);
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
          setAudioLoading(false);
        };

        audio.onerror = () => {
          setIsPlayingAudio(false);
          setAudioLoading(false);
          fallbackWebSpeech(res.cleanText || message.content);
        };

        try {
          await audio.play();
          setIsPlayingAudio(true);
          setAudioLoading(false);
        } catch {
          fallbackWebSpeech(res.cleanText || message.content);
        }
      } else {
        fallbackWebSpeech(res.cleanText || message.content);
      }
    } catch {
      fallbackWebSpeech(message.content);
    }
  };

  const fallbackWebSpeech = (rawText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioLoading(false);
      setIsPlayingAudio(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const sanitized = rawText
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*#_~>|]/g, '')
        .trim()
        .slice(0, 1500);

      if (!sanitized) {
        setAudioLoading(false);
        setIsPlayingAudio(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sanitized);
      (window as unknown as { _activeAetherUtterance?: SpeechSynthesisUtterance })._activeAetherUtterance = utterance;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return (
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') ||
                v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Ava') ||
                v.default)
          ) || voices.find((v) => v.lang.startsWith('en')) || voices[0]
        );
      };

      const preferredVoice = pickVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setAudioLoading(false);
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
        setAudioLoading(false);
        (window as unknown as { _activeAetherUtterance?: SpeechSynthesisUtterance })._activeAetherUtterance = undefined;
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setAudioLoading(false);
        (window as unknown as { _activeAetherUtterance?: SpeechSynthesisUtterance })._activeAetherUtterance = undefined;
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setAudioLoading(false);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`w-full py-2 md:py-3 transition-all ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      <div
        className={`w-full transition-all duration-200 ${
          isUser
            ? 'max-w-2xl ml-auto glass-card rounded-2xl p-4 md:p-5 border border-sky-500/25 text-slate-100 shadow-lg'
            : 'max-w-3xl mr-auto glass-card rounded-3xl p-5 md:p-6 border-l-4 border-l-sky-500 shadow-2xl relative'
        }`}
      >
        {/* Top Meta Header */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            {isUser ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_6px_#38bdf8]" />
                <span className="hud-text text-xs text-sky-300 uppercase">OPERATOR COMMAND</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/40">
                  <div className="w-2.5 h-2.5 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_6px_#38bdf8]" />
                </div>
                <span className="hud-text text-xs text-white uppercase font-bold">AETHER CORE</span>
                {message.modelUsed && (
                  <span className="text-[10px] border border-white/10 px-2 py-0.5 rounded bg-white/5 hud-text text-sky-300 uppercase">
                    {message.modelUsed}
                  </span>
                )}
                {codeBlockCount > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] border border-sky-500/30 px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-mono" title="Code blocks detected with copy buttons">
                    <Code2 className="w-3 h-3 text-sky-400" />
                    <span>{codeBlockCount} {codeBlockCount === 1 ? 'CODE BLOCK' : 'CODE BLOCKS'}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 hud-text text-[10px] text-slate-400">
            {message.latencyMs !== undefined && (
              <span className="flex items-center gap-1 text-emerald-400 font-mono" title="Response Latency">
                <Zap className="w-3 h-3" />
                {message.latencyMs}ms
              </span>
            )}
            {message.tokensUsed !== undefined && (
              <span className="hidden sm:flex items-center gap-1 text-slate-400 font-mono" title="Tokens Processed">
                <Cpu className="w-3 h-3 text-sky-400" />
                {message.tokensUsed}T
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* User Attached Media Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-3.5">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl glass-panel text-xs text-slate-300 border border-white/10"
              >
                {att.type === 'image' ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-10 h-10 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-300">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col max-w-[140px]">
                  <span className="truncate font-medium text-slate-200">{att.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase hud-text">{att.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deep Thinking Accordion */}
        {message.thinkingContent && (
          <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-950/20 overflow-hidden">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs hud-text text-purple-300 hover:bg-purple-900/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>NEURAL REASONING TRACE (HIGH THINKING)</span>
              </div>
              {showThinking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showThinking && (
              <div className="p-3.5 border-t border-purple-500/20 text-xs font-mono text-purple-200/90 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap bg-purple-950/40">
                {message.thinkingContent}
              </div>
            )}
          </div>
        )}

        {/* Primary Message Content (Anti-Raw Text Rich Engine) */}
        {isUser ? (
          <div className="text-slate-100 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
            {message.content}
          </div>
        ) : (
          <RichMarkdownRenderer content={message.content} />
        )}

        {/* Generated Image Rendering Frame */}
        {message.generatedImages && message.generatedImages.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {message.generatedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative group rounded-2xl overflow-hidden border border-sky-500/40 bg-black/60 shadow-[0_8px_30px_rgba(14,165,233,0.15)]"
              >
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  className="w-full max-h-[480px] object-contain mx-auto bg-black/40 transition-transform duration-300 group-hover:scale-[1.01]"
                />

                {/* Action Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex flex-col justify-end">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-sky-200 font-medium truncate max-w-[60%] font-sans">
                      {img.prompt}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {onImageZoom && (
                        <button
                          onClick={() => onImageZoom(img)}
                          className="p-2 rounded-xl glass-card hover:bg-white/10 text-sky-300 border border-sky-500/40 hover:scale-105 transition-all cursor-pointer"
                          title="Zoom In"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={img.imageUrl}
                        download={`aether-image-${Date.now()}.png`}
                        className="p-2 rounded-xl glass-card hover:bg-white/10 text-sky-300 border border-sky-500/40 hover:scale-105 transition-all inline-flex cursor-pointer"
                        title="Download Asset"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {onRegenerateImage && (
                        <button
                          onClick={() => onRegenerateImage(img.prompt)}
                          className="p-2 rounded-xl glass-card hover:bg-white/10 text-purple-300 border border-purple-500/40 hover:scale-105 transition-all cursor-pointer"
                          title="Regenerate"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Grounding Citations */}
        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs hud-text text-sky-400 mb-2">
              <Search className="w-3.5 h-3.5" />
              <span>LIVE GOOGLE SEARCH GROUNDING SOURCES:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.groundingSources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg glass-panel hover:bg-white/10 border border-sky-500/30 text-[11px] text-sky-200 hover:text-sky-100 flex items-center gap-1.5 transition-colors max-w-xs truncate font-sans"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="truncate">{src.title || src.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar Under Response */}
        {!isUser && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* TTS Voice Playback */}
              <button
                id={`tts-btn-${message.id}`}
                onClick={handleTTS}
                disabled={audioLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isPlayingAudio
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                    : 'glass-card hover:bg-white/10 text-slate-300 hover:text-sky-200 border-white/10'
                }`}
                title="Synthesize Voice"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    <span className="text-sky-300 hud-text text-[10px]">STOP AUDIO</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hud-text text-[10px]">{audioLoading ? 'SYNTHESIZING...' : 'SPEAK'}</span>
                  </>
                )}
              </button>

              {/* Copy Full Message */}
              <button
                id={`copy-msg-btn-${message.id}`}
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 hover:text-sky-200 border-white/10 text-xs transition-colors cursor-pointer hud-text text-[10px]"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>

              {/* Retry */}
              {onRetry && (
                <button
                  id={`retry-btn-${message.id}`}
                  onClick={() => onRetry(message.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 hover:text-purple-300 border-white/10 text-xs transition-colors cursor-pointer hud-text text-[10px]"
                  title="Regenerate transmission"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport('md')}
                className="px-2.5 py-1 rounded-lg glass-card hover:bg-white/10 text-[10px] hud-text text-slate-400 hover:text-sky-300 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                title="Export as Markdown"
              >
                <FileDown className="w-3 h-3" />
                <span>MD</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-2.5 py-1 rounded-lg glass-card hover:bg-white/10 text-[10px] hud-text text-slate-400 hover:text-sky-300 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                title="Export as JSON"
              >
                <FileDown className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
