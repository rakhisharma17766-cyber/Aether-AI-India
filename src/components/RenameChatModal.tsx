import React, { useState, useEffect } from 'react';
import { X, Edit2, Check } from 'lucide-react';

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
}

export const RenameChatModal: React.FC<RenameChatModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  onRename,
}) => {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(title.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl glass-card border border-white/15 p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs">
          <div className="flex items-center gap-2.5 hud-text font-bold text-sky-300">
            <Edit2 className="w-4 h-4" />
            <span>RENAME TRANSMISSION</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white glass-card hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl glass-panel border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-sans"
            placeholder="Transmission title..."
            autoFocus
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs hud-text text-slate-400 hover:text-white cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl accent-gradient text-white text-xs hud-text font-bold shadow-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>SAVE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
