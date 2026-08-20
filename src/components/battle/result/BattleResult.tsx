/**
 * BattleResult.tsx - Displays match winner and summary statistics.
 */

import React from 'react';
import { GameState } from '../../../game/engine/GameState';
import { PlayerId } from '../../../game/engine/GamePhase';

interface BattleResultProps {
  state: GameState;
  viewingPlayerId: PlayerId;
  onRematch: () => void;
  onExit: () => void;
}

export const BattleResult: React.FC<BattleResultProps> = ({ state, viewingPlayerId, onRematch, onExit }) => {
  const isWinner = state.winner === viewingPlayerId;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-6 text-white animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className={`text-4xl font-black mb-2 ${isWinner ? 'text-emerald-400' : 'text-red-500'}`}>
          {isWinner ? 'VITÓRIA!' : 'DERROTA'}
        </div>
        <p className="text-slate-400 mb-6">
          {isWinner ? 'Parabéns! Você derrotou seu oponente.' : 'Boa tentativa! Seu oponente venceu a partida.'}
        </p>

        <div className="bg-slate-950 p-4 rounded-xl mb-6 text-xs text-left space-y-2 border border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-400">Motivo:</span>
            <span className="font-semibold text-slate-200">{state.winReason || 'Fim de Jogo'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Turnos jogados:</span>
            <span className="font-semibold text-slate-200">{state.turnNumber}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRematch}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 font-bold rounded-xl shadow-lg transition-colors"
          >
            Jogar Novamente
          </button>
          <button
            onClick={onExit}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
