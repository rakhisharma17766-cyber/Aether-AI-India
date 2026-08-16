import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  Sparkles,
  Zap,
  MoreVertical,
  Settings,
  MessageSquarePlus,
  Trash2,
  Edit2,
  Mic,
  MessageSquare,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { GEMINI_MODELS } from '../config/models';
import { ReasoningLevel } from '../types';

interface TopHUDNavbarProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  reasoningLevel: ReasoningLevel;
  onChangeReasoningLevel: (level: ReasoningLevel) => void;
  onToggleSidebar: () => void;
  onOpenVoiceMode: () => void;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onNewChat: () => void;
  onRenameChat: () => void;
  onClearChat: () => void;
  conversationTitle?: string;
  lastLatencyMs?: number;
  tokensCount?: number;
}

export const TopHUDNavbar: React.FC<TopHUDNavbarProps> = ({
  currentModel,
  onSelectModel,
  reasoningLevel,
  onChangeReasoningLevel,
  onToggleSidebar,
  onOpenVoiceMode,
  onOpenSettings,
  onOpenFeedback,
  onNewChat,
  onRenameChat,
  onClearChat,
  conversationTitle = 'Aether Neural Session',
  lastLatencyMs,
  tokensCount = 0,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const selectedModelObj = GEMINI_MODELS.find((m) => m.id === currentModel) || GEMINI_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 w-full glass-panel rounded-2xl flex items-center justify-between px-4 md:px-6 z-30 shrink-0">
      {/* Left Section: Sidebar Toggle & App Title & Active Model */}
      <div className="flex items-center space-x-4 md:space-x-6">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl glass-card hover:bg-white/5 text-sky-400 border border-white/10 transition-all cursor-pointer"
          title="Toggle Navigation HUD"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Active Model Indicator */}
        <div className="relative" ref={modelMenuRef}>
          <button
            id="model-selector-btn"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex flex-col items-start text-left cursor-pointer group"
          >
            <span className="text-[10px] hud-text text-slate-500 uppercase flex items-center gap-1">
              Active Model <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-sky-400 transition-colors inline" />
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
              {selectedModelObj.name}
              <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 rounded font-mono">
                {selectedModelObj.badge}
              </span>
            </span>
          </button>

          {/* Dropdown Menu */}
          {modelDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl glass-card border border-sky-500/30 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
              <div className="px-3 py-2 border-b border-white/10 text-[10px] hud-text text-sky-400 uppercase tracking-wider flex items-center justify-between">
                <span>Select Intelligence Core</span>
                <span className="text-[9px] text-slate-500">GEMINI 2026</span>
              </div>
              <div className="max-h-72 overflow-y-auto py-1 space-y-1">
                {GEMINI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${
                      currentModel === model.id
                        ? 'bg-sky-500/15 border border-sky-400/40 text-sky-200'
                        : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{model.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/5 text-sky-300 border border-white/10">
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                      {model.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-white/10" />

        {/* Geometric Reasoning HUD */}
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] hud-text text-slate-500 uppercase">Reasoning</span>
          <div className="flex items-center space-x-1.5 mt-1">
            <button
              onClick={() => onChangeReasoningLevel('standard')}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                reasoningLevel === 'standard' || reasoningLevel === 'mid' || reasoningLevel === 'max'
                  ? 'w-4 bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]'
                  : 'w-3 bg-slate-700'
              }`}
              title="Standard Reasoning"
            />
            <button
              onClick={() => onChangeReasoningLevel('mid')}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                reasoningLevel === 'mid' || reasoningLevel === 'max'
                  ? 'w-4 bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]'
                  : 'w-3 bg-slate-700 hover:bg-slate-600'
              }`}
              title="Balanced Mid Reasoning"
            />
            <button
              onClick={() => onChangeReasoningLevel('max')}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                reasoningLevel === 'max'
                  ? 'w-5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]'
                  : 'w-3 bg-slate-700 hover:bg-slate-600'
              }`}
              title="Max Think: Gemini 3.1 Pro High Reasoning"
            />
            <span className="text-[10px] hud-text text-slate-400 uppercase ml-1">
              {reasoningLevel === 'max' ? 'MAX THINK' : reasoningLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section: Telemetry, Voice Trigger, Settings, Actions */}
      <div className="flex items-center space-x-3 md:space-x-5">
        {/* Latency & Telemetry */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] hud-text text-slate-500 uppercase">Latency</span>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            {lastLatencyMs !== undefined ? `${lastLatencyMs}ms` : '14ms'} / {tokensCount ? `${tokensCount}T` : '2.4 T/s'}
          </span>
        </div>

        {/* Live Voice Trigger */}
        <button
          id="voice-mode-trigger-btn"
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sky-300 border border-sky-400/30 text-xs font-hud font-bold tracking-wider transition-all cursor-pointer shadow-lg shadow-sky-950/20"
          title="Activate Cyber Voice HUD Mode"
        >
          <Mic className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">LIVE VOICE</span>
        </button>

        {/* Settings */}
        <button
          id="settings-top-btn"
          onClick={onOpenSettings}
          className="p-2 rounded-xl glass-card hover:bg-white/5 text-slate-300 hover:text-sky-300 border border-white/10 transition-all cursor-pointer"
          title="System Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* 3-Dot Actions Menu */}
        <div className="relative" ref={moreMenuRef}>
          <button
            id="more-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white"
            title="Chat Operations"
          >
            <div className="space-y-1">
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl glass-card border border-white/10 p-2 shadow-2xl z-50 backdrop-blur-2xl">
              <button
                onClick={() => {
                  onNewChat();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-sky-400" />
                <span>New Session</span>
              </button>
              <button
                onClick={() => {
                  onRenameChat();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename Session</span>
              </button>
              <button
                onClick={() => {
                  onOpenFeedback();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Feedback & Support</span>
              </button>
              <div className="my-1 border-t border-white/5" />
              <button
                onClick={() => {
                  onClearChat();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-950/50 text-xs text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Transmission</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
