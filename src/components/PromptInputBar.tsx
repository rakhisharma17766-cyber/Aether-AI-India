import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Send,
  Image as ImageIcon,
  FileText,
  Camera,
  X,
  Sparkles,
  Mic,
  Sliders,
  Layers,
  StopCircle,
} from 'lucide-react';
import { Attachment } from '../types';

interface PromptInputBarProps {
  onSendMessage: (text: string, attachments: Attachment[], imageRes?: '1K' | '2K' | '4K') => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  onOpenVoiceMode: () => void;
  onOpenCameraCapture: () => void;
  currentModel: string;
}

export const PromptInputBar: React.FC<PromptInputBarProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  onOpenVoiceMode,
  onOpenCameraCapture,
  currentModel,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [imageResolution, setImageResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [isImageMode, setIsImageMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detect image generation keywords dynamically
  useEffect(() => {
    const lower = inputText.toLowerCase();
    const isImageIntent =
      lower.startsWith('generate image') ||
      lower.startsWith('create image') ||
      lower.startsWith('draw') ||
      lower.includes('generate an image') ||
      lower.includes('create an image') ||
      currentModel.includes('image') ||
      currentModel.includes('imagen');
    setIsImageMode(isImageIntent);
  }, [inputText, currentModel]);

  // Click outside to close attachment menu
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(inputText.trim(), attachments, isImageMode ? imageResolution : undefined);
    setInputText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = (file: File, type: 'image' | 'document' | 'code') => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      const newAtt: Attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        mimeType: file.type || (type === 'image' ? 'image/png' : 'text/plain'),
        base64Data,
        dataUrl,
        type,
        sizeBytes: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => processFile(file, 'image'));
    }
    setAttachmentMenuOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        const isCode = file.name.match(/\.(ts|tsx|js|jsx|py|html|css|json|rs|go|cpp|c|md)$/i);
        processFile(file, isCode ? 'code' : 'document');
      });
    }
    setAttachmentMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 md:px-4 pb-4">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDocFileChange}
        accept=".pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css"
        multiple
        className="hidden"
      />

      {/* Main Glassmorphic Input Container */}
      <div className="glass-panel rounded-2xl border border-white/10 p-2.5 md:p-3 shadow-2xl focus-within:border-sky-500/40 transition-all">
        {/* Attached Thumbnails Dock */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5 px-1 pt-1 border-b border-white/10 pb-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl glass-card border border-sky-500/30 text-xs text-slate-200"
              >
                {att.type === 'image' ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-8 h-8 rounded-lg object-cover border border-sky-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 rounded-full hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Image Mode Controls */}
        {isImageMode && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-xl glass-card border border-sky-500/30 text-xs">
            <div className="flex items-center gap-1.5 text-sky-300 hud-text">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>IMAGE SYNTHESIS DETECTED</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] hud-text text-slate-400 mr-1">RES:</span>
              {(['1K', '2K', '4K'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setImageResolution(res)}
                  className={`px-2 py-0.5 rounded-md text-[10px] hud-text font-bold transition-all cursor-pointer ${
                    imageResolution === res
                      ? 'bg-sky-400 text-slate-950 shadow-[0_0_8px_#38bdf8]'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Input Row */}
        <div className="flex items-end gap-2">
          {/* Attachment Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              id="attachment-menu-btn"
              type="button"
              onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
              className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-sky-400 border border-white/10 hover:border-sky-400 transition-all cursor-pointer shadow-md"
              title="Multimodal Attachments"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Attachment Flyout */}
            {attachmentMenuOpen && (
              <div className="absolute bottom-12 left-0 w-48 rounded-2xl glass-card border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenCameraCapture();
                    setAttachmentMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-slate-200 hover:text-sky-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Document / Code</span>
                </button>
              </div>
            )}
          </div>

          {/* Prompt Textarea */}
          <textarea
            ref={textareaRef}
            id="prompt-textarea"
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Anything Here"
            className="flex-1 bg-transparent border-0 text-sm md:text-[15px] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 resize-none py-2 px-1 max-h-44 leading-relaxed font-sans"
          />

          {/* Voice Mode Button */}
          <button
            type="button"
            id="voice-mode-prompt-btn"
            onClick={onOpenVoiceMode}
            className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-sky-400 hover:text-sky-300 border border-white/10 hover:border-sky-400 transition-all cursor-pointer"
            title="Open Voice HUD"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send / Stop Button */}
          {isLoading ? (
            <button
              type="button"
              id="stop-generation-btn"
              onClick={onStopGeneration}
              className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
              title="Abort Transmission"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="send-prompt-btn"
              onClick={handleSend}
              disabled={!inputText.trim() && attachments.length === 0}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                inputText.trim() || attachments.length > 0
                  ? 'accent-gradient text-white border-sky-400/50 shadow-lg shadow-sky-950/40 hover:opacity-95'
                  : 'bg-white/5 text-slate-600 border-white/10 cursor-not-allowed'
              }`}
              title="Transmit (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
