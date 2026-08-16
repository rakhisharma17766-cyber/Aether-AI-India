import React, { useState } from 'react';
import { X, Send, Star, MessageSquare, Check, Sparkles } from 'lucide-react';
import { FeedbackData } from '../types';
import { submitUserFeedback } from '../services/firebaseService';
import confetti from 'canvas-confetti';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userId,
}) => {
  const [category, setCategory] = useState<'bug' | 'feature' | 'prompt_quality' | 'ui_ux' | 'other'>('feature');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    const feedback: FeedbackData = {
      userId: userId || 'anonymous_user',
      userEmail: email || userEmail || 'anonymous@aether.ai',
      category,
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await submitUserFeedback(feedback);
      setSubmitted(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00f0ff', '#a855f7', '#38bdf8'],
        });
      } catch {}
      setTimeout(() => {
        setSubmitted(false);
        setComment('');
        onClose();
      }, 2000);
    } catch (err) {
      console.warn('Feedback submission error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl glass-card border border-white/15 p-6 md:p-8 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="hud-text text-sm text-white uppercase font-bold">
                TRANSMIT FEEDBACK & SUPPORT
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Direct Firestore Feedback Stream
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-card hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-sm hud-text text-emerald-300 uppercase font-bold">
              TRANSMISSION LOGGED IN FIRESTORE
            </h3>
            <p className="text-xs text-slate-300 max-w-xs font-mono">
              Thank you for improving Aether AI. Your feedback telemetry has been indexed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-xs hud-text text-sky-300 uppercase block mb-1.5 font-bold">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['feature', 'bug', 'prompt_quality', 'ui_ux', 'other'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-1.5 px-2 rounded-xl text-xs hud-text capitalize border transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.2)]'
                        : 'glass-panel text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="text-xs hud-text text-sky-300 uppercase block mb-1.5 font-bold">
                Experience Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="text-xs hud-text text-sky-300 uppercase block mb-1 font-bold">
                Your Email (Optional)
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-panel border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-sans"
              />
            </div>

            {/* Message / Comments */}
            <div>
              <label className="text-xs hud-text text-sky-300 uppercase block mb-1 font-bold">
                Feedback & Observations
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe your issue, feature idea, or model output quality..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3 rounded-xl glass-panel border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-sans resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs hud-text text-slate-400 hover:text-white cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                id="submit-feedback-btn"
                disabled={isSubmitting || !comment.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl accent-gradient text-white text-xs hud-text tracking-wider shadow-lg shadow-sky-950/40 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'TRANSMITTING...' : 'SUBMIT FEEDBACK'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
