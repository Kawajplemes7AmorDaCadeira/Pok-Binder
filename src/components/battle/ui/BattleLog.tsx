/**
 * BattleLog.tsx - Displays game history and event logs.
 */

import React from 'react';
import { GameActionRecord } from '../../../game/engine/GameState';

interface BattleLogProps {
  actionHistory: GameActionRecord[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ actionHistory }) => {
  return (
    <div className="bg-slate-900/90 text-slate-200 p-4 rounded-xl border border-slate-700 h-64 overflow-y-auto font-mono text-xs shadow-xl">
      <h3 className="text-sm font-bold text-red-400 mb-2 border-b border-slate-800 pb-1">Histórico de Batalha</h3>
      {actionHistory.length === 0 ? (
        <p className="text-slate-500 italic">Nenhuma ação registrada ainda...</p>
      ) : (
        <div className="space-y-1.5">
          {actionHistory.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-2 border-b border-slate-800/50 pb-1">
              <span className="text-slate-400">[{rec.action.playerId}]</span>
              <span className="text-red-300 font-semibold">{rec.action.type}</span>
              <span className="text-slate-500 ml-auto">Turno {rec.turnNumber}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
