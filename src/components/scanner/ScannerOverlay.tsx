import React from 'react';
import { AlertCircle, Moon, Sparkles, SunMedium } from 'lucide-react';
import { ImageQualityAssessment } from '../../services/scanner/types';

interface ScannerOverlayProps {
  isProcessing: boolean;
  qualityAssessment: ImageQualityAssessment | null;
  statusMessage?: string;
  autoCaptureCountdown?: number | null;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  isProcessing,
  qualityAssessment,
  statusMessage,
  autoCaptureCountdown,
}) => {
  const isDark = qualityAssessment?.isDark;
  const isGlary = qualityAssessment?.isGlary;
  const isBlurry = qualityAssessment?.isBlurry;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 select-none z-10">
      {/* Target Reticle (Proportion 63mm x 88mm ~ 0.716) */}
      <div className="relative w-64 h-92 sm:w-72 sm:h-[400px] border-2 border-red-500/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.68)] overflow-hidden transition-all">
        {/* Reticle Corner Highlights */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg shadow-sm" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg shadow-sm" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg shadow-sm" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg shadow-sm" />

        {/* Top Region Guide Line (Name & HP zone) */}
        <div className="absolute top-[22%] inset-x-2 border-b border-dashed border-white/25 flex justify-end pr-2">
          <span className="text-[9px] text-white/60 font-semibold tracking-wider uppercase">
            Nome / HP
          </span>
        </div>

        {/* Bottom Region Guide Line (Collector Number zone) */}
        <div className="absolute bottom-[18%] inset-x-2 border-t border-dashed border-white/25 flex justify-end pr-2">
          <span className="text-[9px] text-white/60 font-semibold tracking-wider uppercase">
            Nº / Coleção
          </span>
        </div>

        {/* Scanning Laser Beam Effect */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_16px_#ef4444] animate-[scanLaser_2.5s_ease-in-out_infinite]" />

        {/* Auto Capture Countdown Animation */}
        {autoCaptureCountdown !== null && autoCaptureCountdown !== undefined && autoCaptureCountdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/30 backdrop-blur-[2px]">
            <div className="w-14 h-14 rounded-full bg-red-600/90 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-xl animate-ping">
              {autoCaptureCountdown}
            </div>
          </div>
        )}
      </div>

      {/* Floating Status & Real-time Vision Feedback Badges */}
      <div className="mt-4 flex flex-col items-center gap-1.5 max-w-sm text-center px-4">
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-slate-900/90 border border-slate-700 text-amber-300 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Processando imagem com IA & OCR...</span>
          </div>
        )}

        {/* Environment / Glare / Lighting Warnings */}
        {!isProcessing && isDark && (
          <div className="bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Pouca iluminação. Ative a lanterna.</span>
          </div>
        )}

        {!isProcessing && !isDark && isGlary && (
          <div className="bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
            <SunMedium className="w-3.5 h-3.5 text-amber-400" />
            <span>Reflexo detectado. Incline levemente o celular.</span>
          </div>
        )}

        {!isProcessing && !isDark && !isGlary && isBlurry && (
          <div className="bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Mova menos o celular para focar a carta.</span>
          </div>
        )}

        {statusMessage && !isDark && !isGlary && !isBlurry && !isProcessing && (
          <div className="bg-black/60 backdrop-blur-md text-slate-200 text-[11px] font-medium px-3 py-1 rounded-full border border-white/10">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
