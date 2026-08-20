import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code2, Cpu } from 'lucide-react';
import { ScanRecognitionResult } from '../../services/scanner/types';

interface ScannerDevPanelProps {
  recognitionResult: ScanRecognitionResult | null;
}

export const ScannerDevPanel: React.FC<ScannerDevPanelProps> = ({ recognitionResult }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!recognitionResult) return null;

  return (
    <div className="bg-slate-950/90 border-t border-slate-800 text-slate-300 text-xs font-mono select-text">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-amber-300 transition-colors bg-slate-900/60"
      >
        <span className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          Debug OCR & Match Breakdown ({recognitionResult.candidates.length} candidatos)
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 max-h-56 overflow-y-auto divide-y divide-slate-800/80">
          {/* OCR RAW DETECTED */}
          <div className="space-y-1">
            <span className="text-amber-400 font-bold text-[10px] uppercase">
              1. OCR RAW DETECTED:
            </span>
            <pre className="p-2 bg-slate-900 rounded-lg text-[10px] whitespace-pre-wrap text-slate-300">
              {recognitionResult.rawText || '(Nenhum texto bruto)'}
            </pre>
          </div>

          {/* NORMALIZED TOKENS */}
          <div className="pt-2 space-y-1">
            <span className="text-cyan-400 font-bold text-[10px] uppercase">
              2. NORMALIZED PARSED TOKENS:
            </span>
            <div className="text-[11px] space-y-0.5 text-slate-300">
              <p>
                <strong>Numbers:</strong>{' '}
                {recognitionResult.extractedTokens.collectorNumbers.join(', ') || 'Nenhum'}
              </p>
              <p>
                <strong>Names:</strong>{' '}
                {recognitionResult.extractedTokens.nameCandidates.join(', ') || 'Nenhum'}
              </p>
              <p>
                <strong>HP:</strong>{' '}
                {recognitionResult.extractedTokens.hpCandidates.join(', ') || 'Nenhum'}
              </p>
              <p>
                <strong>Regulation Mark:</strong>{' '}
                {recognitionResult.extractedTokens.regulationMarks.join(', ') || 'Nenhum'}
              </p>
              <p>
                <strong>Set Code Hints:</strong>{' '}
                {recognitionResult.extractedTokens.setHints.join(', ') || 'Nenhum'}
              </p>
            </div>
          </div>

          {/* CANDIDATE SCORES BREAKDOWN */}
          <div className="pt-2 space-y-1.5">
            <span className="text-emerald-400 font-bold text-[10px] uppercase">
              3. CANDIDATES & CONFIDENCE SCORES:
            </span>
            {recognitionResult.candidates.map((c, idx) => (
              <div
                key={c.card.id}
                className="p-2 bg-slate-900/90 rounded-lg text-[10px] space-y-0.5 border border-slate-800"
              >
                <div className="flex justify-between font-bold text-white">
                  <span>
                    #{idx + 1} {c.card.name} (#{c.card.localId})
                  </span>
                  <span className="text-amber-400">{c.confidence}%</span>
                </div>
                <div className="text-slate-400 flex flex-wrap gap-x-3">
                  <span>Nº: +{c.matchBreakdown.numberMatch}/45</span>
                  <span>Nome: +{c.matchBreakdown.nameMatch}/25</span>
                  <span>Set: +{c.matchBreakdown.setMatch}/20</span>
                  <span>Lang: +{c.matchBreakdown.languageMatch}/5</span>
                  <span>HP: +{c.matchBreakdown.hpMatch}/5</span>
                </div>
                {c.reasons.length > 0 && (
                  <p className="text-emerald-400/90 italic">
                    {c.reasons.join(' • ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
