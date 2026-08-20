import React from 'react';
import { Settings, Sliders, Volume2, VolumeX, Vibrate, Zap, Check, X } from 'lucide-react';
import { CardCondition, CardVariant } from '../../types';
import { ScannerSettings } from '../../services/scanner/types';

interface ScannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScannerSettings;
  onUpdateSettings: (newSettings: Partial<ScannerSettings>) => void;
}

export const ScannerSettingsModal: React.FC<ScannerSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-slideUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">Configurações do Scanner</h3>
              <p className="text-slate-400 text-[11px]">Personalize o fluxo de captura e cadastro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Default Condition */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Condição Padrão ao Adicionar:</label>
            <select
              value={settings.defaultCondition}
              onChange={(e) =>
                onUpdateSettings({ defaultCondition: e.target.value as CardCondition })
              }
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500"
            >
              <option value="near_mint">Near Mint (Excelente - Padrão)</option>
              <option value="mint">Mint (Perfeita)</option>
              <option value="lightly_played">Lightly Played (Pouco Usada)</option>
              <option value="moderately_played">Moderately Played (Marcada)</option>
              <option value="heavily_played">Heavily Played (Desgastada)</option>
            </select>
          </div>

          {/* Default Variant */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">Variante Padrão:</label>
            <select
              value={settings.defaultVariant}
              onChange={(e) =>
                onUpdateSettings({ defaultVariant: e.target.value as CardVariant })
              }
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500"
            >
              <option value="normal">Normal / Regular</option>
              <option value="holo">Foil / Holofote</option>
              <option value="reverse">Reverse Holo</option>
              <option value="firstEdition">1ª Edição</option>
            </select>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            {/* Auto Capture Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-white font-bold block">Captura Automática Inteligente</span>
                <span className="text-slate-400 text-[11px]">
                  Dispara quando a carta estiver estável e bem iluminada
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCapture}
                onChange={(e) => onUpdateSettings({ autoCapture: e.target.checked })}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>

            {/* Sound Feedback */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-white font-bold block">Sons de Feedback</span>
                <span className="text-slate-400 text-[11px]">Efeitos sonoros suaves ao escanear</span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundFeedback}
                onChange={(e) => onUpdateSettings({ soundFeedback: e.target.checked })}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>

            {/* Haptic Feedback */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-white font-bold block">Vibração Háptica no Celular</span>
                <span className="text-slate-400 text-[11px]">Resposta tátil ao confirmar carta</span>
              </div>
              <input
                type="checkbox"
                checked={settings.hapticFeedback}
                onChange={(e) => onUpdateSettings({ hapticFeedback: e.target.checked })}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs shadow-lg transition-all active:scale-95"
        >
          Salvar e Fechar
        </button>
      </div>
    </div>
  );
};
