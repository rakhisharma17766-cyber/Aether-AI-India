import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Key,
  Sliders,
  Sparkles,
  Bot,
  Volume2,
  Check,
  AlertCircle,
  Cpu,
  Search,
  Brain,
  Layers,
  Save,
  Radio,
  Shield,
  Clock,
  Trash2,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { AI_PERSONAS } from '../config/personas';
import { UserPreferences } from '../types';
import { testApiKeyAndFetchModels } from '../services/geminiService';
import { purgeExpiredData } from '../services/firebaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  user,
  onLogin,
  onLogout,
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    loading: boolean;
    valid?: boolean;
    models?: string[];
    error?: string;
  }>({ tested: false, loading: false });

  const [purgeStatus, setPurgeStatus] = useState<{
    running: boolean;
    completed: boolean;
    purgedCount?: number;
    cutoffDate?: string;
  }>({ running: false, completed: false });

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setTestStatus({ tested: true, loading: true });
    const result = await testApiKeyAndFetchModels(localPrefs.apiKey);
    setTestStatus({
      tested: true,
      loading: false,
      valid: result.valid,
      models: result.models,
      error: result.error,
    });
  };

  const handleRunPurge = async () => {
    setPurgeStatus({ running: true, completed: false });
    try {
      const result = await purgeExpiredData(user);
      setPurgeStatus({
        running: false,
        completed: true,
        purgedCount: result.purgedCount,
        cutoffDate: result.cutoffDate.toLocaleDateString(),
      });
    } catch (e) {
      setPurgeStatus({ running: false, completed: true, purgedCount: 0 });
    }
  };

  const handleSave = () => {
    // Save custom key to localStorage
    if (localPrefs.apiKey) {
      localStorage.setItem('aether_custom_api_key', localPrefs.apiKey.trim());
    } else {
      localStorage.removeItem('aether_custom_api_key');
    }
    onSavePreferences(localPrefs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl glass-card border border-white/15 p-6 md:p-8 flex flex-col shadow-2xl max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="hud-text font-bold text-base text-white uppercase">
                AETHER SYSTEM CONFIGURATION
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Firebase Cloud Sync & Gemini Tuning Matrix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-card hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 font-sans">
          {/* Section 0: Firebase User Account & Sync Status */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Google Firebase Authentication</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                {user ? 'CLOUD AUTHENTICATED' : 'ANONYMOUS / LOCAL'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-10 h-10 rounded-full border border-sky-400/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-sky-300 shrink-0">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-white">
                    {user?.displayName || 'Anonymous Operator'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {user?.email || 'Sessions backed up locally and synced to secure Firestore cloud'}
                  </p>
                </div>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-1.5 rounded-xl glass-card hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs hud-text font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>SIGN OUT</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="px-4 py-2 rounded-xl accent-gradient text-white text-xs hud-text font-bold tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-sky-950/40 cursor-pointer self-end sm:self-auto"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>SIGN IN WITH GOOGLE</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 0.5: 60-Day Data Retention Engine */}
          <div className="p-4 rounded-2xl glass-panel border border-sky-500/20 bg-sky-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>60-Day Database Retention Policy</span>
              </label>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
                AUTO-PURGE ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              To maximize privacy and optimize cloud capacity, all transmissions and stored messages exceeding <strong className="text-sky-300">60 days</strong> of age are automatically purged from the database upon user authentication and scheduled background sweeps.
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] font-mono text-slate-400">
                Retention Window: <strong className="text-slate-200">60 Days (Rolling)</strong>
              </span>
              <button
                type="button"
                onClick={handleRunPurge}
                disabled={purgeStatus.running}
                className="px-3.5 py-1.5 rounded-xl glass-card hover:bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs hud-text font-bold tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${purgeStatus.running ? 'animate-spin' : ''}`} />
                <span>{purgeStatus.running ? 'PURGING...' : 'RUN SWEEP NOW'}</span>
              </button>
            </div>

            {purgeStatus.completed && (
              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs font-mono text-sky-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Sweep complete: {purgeStatus.purgedCount} expired items older than 60 days deleted.
                </span>
              </div>
            )}
          </div>

          {/* Section 1: API Key & 405 Zero-Error Tester */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                <span>Gemini API Key</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {localPrefs.apiKey ? 'Custom Key Set' : 'Auto-detected / Demo Mode'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="password"
                placeholder="AIzaSy... (leave blank to use environment secret)"
                value={localPrefs.apiKey}
                onChange={(e) => {
                  setLocalPrefs({ ...localPrefs, apiKey: e.target.value });
                  setTestStatus({ tested: false, loading: false });
                }}
                className="flex-1 px-3.5 py-2 rounded-xl glass-panel border border-white/10 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
              />
              <button
                id="test-key-btn"
                type="button"
                onClick={handleTestKey}
                disabled={testStatus.loading}
                className="px-4 py-2 rounded-xl glass-card hover:bg-white/10 text-sky-300 border border-sky-500/40 text-xs hud-text font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {testStatus.loading ? 'PROBING...' : 'TEST KEY'}
              </button>
            </div>

            {/* Test Result Feedback */}
            {testStatus.tested && (
              <div
                className={`p-3 rounded-xl text-xs font-mono border flex items-start gap-2.5 ${
                  testStatus.valid
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                {testStatus.valid ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold hud-text">KEY AUTHENTICATED SUCCESSFULLY</p>
                      <p className="text-[11px] text-emerald-400/80 mt-1">
                        Detected {testStatus.models?.length || 0} Gemini models ready for inference.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold hud-text">KEY VERIFICATION FAILED</p>
                      <p className="text-[11px] text-rose-300/80 mt-0.5">{testStatus.error}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 2: AI Persona Matrix */}
          <div className="space-y-3">
            <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Persona Configuration</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AI_PERSONAS.map((persona) => {
                const isSelected = localPrefs.personaId === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() =>
                      setLocalPrefs({
                        ...localPrefs,
                        personaId: persona.id,
                        customSystemPrompt: persona.systemInstruction,
                      })
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                        : 'glass-panel border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="hud-text font-bold text-xs text-slate-200">
                          {persona.name}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: persona.color }}
                        />
                      </div>
                      <p className="text-[11px] font-mono text-sky-300/80 mb-1">{persona.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {persona.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Custom System Instructions */}
          <div className="space-y-2">
            <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Custom System Prompt (Directives)</span>
            </label>
            <textarea
              rows={3}
              value={localPrefs.customSystemPrompt}
              onChange={(e) =>
                setLocalPrefs({ ...localPrefs, customSystemPrompt: e.target.value })
              }
              placeholder="Inject custom instructions to steer the model's tone, formatting, and constraints..."
              className="w-full p-3 rounded-xl glass-panel border border-white/10 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 leading-relaxed resize-none"
            />
          </div>

          {/* Section 4: Voice & Audio Settings */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs hud-text font-bold text-sky-300 uppercase flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Text-To-Speech Neural Voice Synthesis</span>
              </label>
              <span className="text-[10px] font-mono text-sky-400">
                Uses User API Key TTS + Web Speech Backup
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() => setLocalPrefs({ ...localPrefs, ttsVoice: voice })}
                  className={`py-2 px-3 rounded-xl text-xs hud-text font-bold text-center border transition-all cursor-pointer ${
                    localPrefs.ttsVoice === voice
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                      : 'glass-card text-slate-400 hover:text-white border-white/10'
                  }`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Advanced Intelligence Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search Grounding Toggle */}
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-sky-400" />
                <div>
                  <span className="text-xs hud-text font-bold text-slate-200 block">
                    Google Search Grounding
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Live web facts & citations
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.enableSearchGrounding}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, enableSearchGrounding: e.target.checked })
                }
                className="w-4 h-4 accent-sky-400 cursor-pointer"
              />
            </div>

            {/* High Thinking Toggle */}
            <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-xs hud-text font-bold text-slate-200 block">
                    High Thinking Mode
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Deep mathematical reasoning
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.enableThinking}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, enableThinking: e.target.checked })
                }
                className="w-4 h-4 accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs hud-text font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            id="save-settings-btn"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl accent-gradient text-white text-xs hud-text font-bold tracking-wider shadow-lg shadow-sky-950/40 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
