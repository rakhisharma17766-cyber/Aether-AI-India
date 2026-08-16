import React from 'react';
import { X, Download, RotateCcw, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { GeneratedImagePayload } from '../types';

interface ImagePreviewModalProps {
  image: GeneratedImagePayload | null;
  onClose: () => void;
  onRegenerate?: (prompt: string) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  onClose,
  onRegenerate,
}) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl glass-card border border-white/15 p-4 md:p-6 flex flex-col items-center shadow-2xl max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="hud-text font-bold text-sm text-white uppercase">
                SYNTHESIZED VISUAL ARTIFACT
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">{image.model}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-card hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Preview Canvas */}
        <div className="relative w-full flex-1 min-h-[300px] max-h-[65vh] flex items-center justify-center bg-black/60 rounded-2xl border border-white/10 overflow-hidden p-2">
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          />
        </div>

        {/* Bottom Details & Controls */}
        <div className="w-full mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <span className="text-[10px] hud-text uppercase text-sky-400 block mb-0.5 font-bold">
              Generation Prompt:
            </span>
            <p className="text-xs text-slate-200 line-clamp-2 font-sans font-medium">
              "{image.prompt}"
            </p>
          </div>

          <div className="flex items-center gap-2">
            {image.resolution && (
              <span className="px-2.5 py-1 rounded-lg text-xs hud-text bg-white/5 text-sky-300 border border-white/10">
                {image.resolution}
              </span>
            )}
            <a
              href={image.imageUrl}
              download={`aether-visual-${Date.now()}.png`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl accent-gradient text-white text-xs hud-text font-bold tracking-wider transition-all shadow-lg shadow-sky-950/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD</span>
            </a>
            {onRegenerate && (
              <button
                onClick={() => {
                  onRegenerate(image.prompt);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass-card hover:bg-white/10 text-purple-200 border border-purple-500/40 text-xs hud-text font-bold tracking-wider transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REGENERATE</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
