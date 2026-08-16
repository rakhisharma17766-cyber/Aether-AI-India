import React from 'react';
import { Key, Settings, AlertTriangle, X } from 'lucide-react';

interface ApiKeyBannerProps {
  onOpenSettings: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export const ApiKeyBanner: React.FC<ApiKeyBannerProps> = ({
  onOpenSettings,
  onDismiss,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="w-full glass-panel border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3 text-xs hud-text backdrop-blur-xl z-20">
      <div className="flex items-center gap-2 text-sky-300">
        <div className="w-2 h-2 rounded-sm bg-sky-400 rotate-45 shadow-[0_0_6px_#38bdf8]" />
        <span className="hidden sm:inline">
          AETHER NEURAL ENGINE IS ACTIVE WITH ZERO-405 API FALLBACK. CONFIGURE CUSTOM GEMINI KEY IN SETTINGS.
        </span>
        <span className="sm:hidden">
          AETHER CORE READY. CONFIGURE CUSTOM GEMINI KEY ANYTIME.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card hover:bg-white/10 text-sky-200 border border-sky-400/40 text-[10px] hud-text transition-all cursor-pointer"
        >
          <Settings className="w-3 h-3" />
          <span>CONFIG</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
