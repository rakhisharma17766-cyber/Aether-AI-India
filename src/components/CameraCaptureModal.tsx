import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Sparkles } from 'lucide-react';
import { Attachment } from '../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (attachment: Attachment) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async (mode: 'user' | 'environment') => {
    setErrorMsg(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable', err);
      setErrorMsg('Unable to access camera. Please allow camera permissions in your browser.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedDataUrl(dataUrl);
    }
  };

  const handleConfirmAttachment = () => {
    if (!capturedDataUrl) return;
    const base64Data = capturedDataUrl.split(',')[1];
    const attachment: Attachment = {
      id: `cam_${Date.now()}`,
      name: `camera_snapshot_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      base64Data,
      dataUrl: capturedDataUrl,
      type: 'image',
    };
    onCapture(attachment);
    onClose();
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl glass-card border border-white/15 p-4 md:p-6 flex flex-col items-center shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="hud-text font-bold text-sm text-white uppercase">
              MULTIMODAL OPTICAL SCANNER
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white glass-card hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Feed / Snapshot Preview */}
        <div className="relative w-full aspect-video bg-black/80 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
          {errorMsg ? (
            <p className="p-4 text-xs font-mono text-rose-400 text-center">{errorMsg}</p>
          ) : capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="Snapshot"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
            />
          )}

          {/* Scan Grid Overlay */}
          {!capturedDataUrl && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="w-full h-0.5 bg-sky-400/60 shadow-[0_0_8px_#38bdf8] animate-pulse absolute top-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full mt-4 flex items-center justify-between gap-3">
          <button
            onClick={toggleFacingMode}
            disabled={!!capturedDataUrl}
            className="p-2.5 rounded-xl glass-card hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono transition-colors disabled:opacity-30 cursor-pointer"
            title="Switch Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {capturedDataUrl ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetake}
                className="px-3.5 py-2 rounded-xl glass-card hover:bg-white/10 text-xs hud-text text-slate-300 border border-white/10 transition-colors cursor-pointer"
              >
                RETAKE
              </button>
              <button
                onClick={handleConfirmAttachment}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl accent-gradient text-white text-xs hud-text font-bold tracking-wider shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ATTACH TO PROMPT</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleTakeSnapshot}
              disabled={!!errorMsg}
              className="px-6 py-2.5 rounded-full accent-gradient text-white hud-text font-bold text-xs tracking-wider shadow-lg shadow-sky-950/40 transition-all transform hover:scale-105 cursor-pointer"
            >
              CAPTURE SCAN
            </button>
          )}

          <div className="w-8" />
        </div>
      </div>
    </div>
  );
};
