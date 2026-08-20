/**
 * PendingChoiceModal.tsx - Modal for handling pending player choices (Selecting active, prizes, etc.).
 */

import React from 'react';
import { PendingChoice } from '../../../game/engine/GameState';

interface PendingChoiceModalProps {
  pendingChoices: PendingChoice[];
  onMakeChoice: (choiceId: string, selectedIds: string[]) => void;
}

export const PendingChoiceModal: React.FC<PendingChoiceModalProps> = ({ pendingChoices, onMakeChoice }) => {
  if (pendingChoices.length === 0) return null;

  const choice = pendingChoices[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white">
        <h3 className="text-xl font-bold text-red-400 mb-2">Escolha Requerida</h3>
        <p className="text-sm text-slate-300 mb-6 capitalize">Tipo: {choice.type.replace(/_/g, ' ')}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onMakeChoice(choice.id, [])}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 font-semibold rounded-xl text-white shadow-lg transition-colors"
          >
            Confirmar Seleção
          </button>
        </div>
      </div>
    </div>
  );
};
