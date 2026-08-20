/**
 * BattleLobby.tsx - Matchmaking and lobby screen before entering the BattleArena.
 */

import React, { useState } from 'react';

interface BattleLobbyProps {
  onStartBattle: (botMode: 'EASY' | 'NORMAL' | 'NONE') => void;
}

export const BattleLobby: React.FC<BattleLobbyProps> = ({ onStartBattle }) => {
  const [botMode, setBotMode] = useState<'EASY' | 'NORMAL' | 'NONE'>('EASY');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-black text-center mb-2 tracking-tight text-red-500">BATTLE ARENA</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Participe de batalhas de Pokémon TCG com regras oficiais</p>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Seu Deck</label>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-medium flex items-center justify-between">
              <span>Deck Padrão (Tyrogue & Charizard)</span>
              <span className="text-emerald-400 text-xs bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">100% Suportado</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Oponente</label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${botMode === 'EASY' ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-950 border-slate-800'}`}>
                <input type="radio" name="opponent" checked={botMode === 'EASY'} onChange={() => setBotMode('EASY')} className="text-red-500 focus:ring-red-500" />
                <span className="text-sm font-medium">Bot Fácil (Iniciante)</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${botMode === 'NORMAL' ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-950 border-slate-800'}`}>
                <input type="radio" name="opponent" checked={botMode === 'NORMAL'} onChange={() => setBotMode('NORMAL')} className="text-red-500 focus:ring-red-500" />
                <span className="text-sm font-medium">Bot Normal (Estratégico)</span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={() => onStartBattle(botMode)}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all text-center"
        >
          INICIAR BATALHA
        </button>
      </div>
    </div>
  );
};
