/**
 * BattleArena.tsx - Main interactive match screen connecting controller, board, legal actions, and bot.
 */

import React, { useState, useEffect } from 'react';
import { BattleController } from '../../game/engine/BattleController';
import { LegalActionGenerator, LegalActionOption } from '../../game/engine/LegalActionGenerator';
import { SetupScreen } from './setup/SetupScreen';
import { BattleResult } from './result/BattleResult';
import { PendingChoiceModal } from './ui/PendingChoiceModal';
import { BattleLog } from './ui/BattleLog';

interface BattleArenaProps {
  controller: BattleController;
  onExit: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ controller, onExit }) => {
  const [state, setState] = useState(controller.getState());
  const [view, setView] = useState(controller.getPlayerView('P1'));
  const [legalActions, setLegalActions] = useState<LegalActionOption[]>([]);
  const [showLog, setShowLog] = useState(false);

  const refreshState = () => {
    const currentState = controller.getState();
    setState(currentState);
    setView(controller.getPlayerView('P1'));
    setLegalActions(LegalActionGenerator.getLegalActions(currentState, 'P1'));
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleAction = (action: any) => {
    const res = controller.dispatch(action);
    if (res.success) {
      refreshState();
    } else {
      alert(`Ação rejeitada: ${res.error?.message || 'Erro desconhecido'}`);
    }
  };

  const isSetup = state.status === 'SETUP';
  const isFinished = state.status === 'FINISHED';

  const opponentView = view.players.P2;
  const playerView = view.players.P1;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <span className="font-black tracking-wider text-red-500">POKÉBINDER ARENA</span>
          <span className="text-xs px-2 py-1 bg-slate-800 rounded font-mono text-slate-300">Turno {state.turnNumber}</span>
          <span className="text-xs px-2 py-1 bg-red-950 text-red-300 rounded font-mono border border-red-900">
            {state.activePlayerId === 'P1' ? 'SEU TURNO' : 'TURNO DO OPONENTE'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLog(!showLog)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {showLog ? 'Ocultar Log' : 'Ver Log'}
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900 text-xs font-semibold text-red-300 rounded-lg border border-red-900 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Main Board */}
      <div className="flex-1 flex flex-col justify-between p-6 max-w-7xl mx-auto w-full relative">
        {/* Opponent Field */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Oponente (P2)</span>
            <span>Mão: {opponentView.handCount} | Deck: {opponentView.deckCount} | Prêmios: {opponentView.prizeCount}</span>
          </div>

          <div className="flex justify-center gap-4">
            <div className="w-24 h-32 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xs">
              {opponentView.activePokemon ? `Ativo: ${opponentView.activePokemon.damage}dmg` : 'Sem Ativo'}
            </div>
          </div>
        </div>

        {/* Center Arena / Stadium */}
        <div className="flex items-center justify-center my-4">
          <div className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 uppercase tracking-widest shadow-inner">
            {state.stadium ? `Estádio: ${state.stadium.cardId}` : 'Nenhum Estádio em Campo'}
          </div>
        </div>

        {/* Player Field */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex justify-center gap-4">
            <div className="w-28 h-36 bg-slate-800 border border-red-500/40 rounded-xl flex flex-col items-center justify-center p-2 text-center text-xs shadow-lg">
              <span className="font-bold text-red-300 mb-1">Seu Ativo</span>
              {playerView.activePokemon ? (
                <>
                  <div className="text-white font-mono text-[10px] mb-2">{playerView.activePokemon.evolutionStack[0].cardId}</div>
                  <div className="text-emerald-400 text-[10px]">Dano: {playerView.activePokemon.damage}</div>
                </>
              ) : (
                <span className="text-slate-500 italic">Nenhum</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Você (P1)</span>
            <span>Deck: {playerView.deckCount} | Prêmios: {playerView.prizeCount}</span>
          </div>
        </div>

        {/* Player Hand & Actions Toolbar */}
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sua Mão ({playerView.hand?.length || 0})</span>
            <div className="flex gap-2">
              {legalActions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAction(opt.action)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-lg shadow transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {playerView.hand?.map((card) => (
              <div key={card.instanceId} className="w-24 h-32 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col justify-between text-xs shadow hover:-translate-y-2 transition-transform cursor-pointer">
                <span className="font-bold text-red-300 truncate">{card.cardId}</span>
                <span className="text-[10px] text-slate-400">Instância</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side Log Drawer */}
      {showLog && (
        <div className="absolute right-6 top-20 z-30 w-80">
          <BattleLog actionHistory={state.actionHistory} />
        </div>
      )}

      {/* Setup Overlay */}
      {isSetup && <SetupScreen view={view} onAction={handleAction} />}

      {/* Pending Choice Modal */}
      <PendingChoiceModal pendingChoices={state.pendingChoices} onMakeChoice={(id, sel) => handleAction({ actionId: `act_${Date.now()}`, type: 'MAKE_CHOICE', playerId: 'P1', choiceId: id, selectedIds: sel })} />

      {/* Result Overlay */}
      {isFinished && <BattleResult state={state} viewingPlayerId="P1" onRematch={() => window.location.reload()} onExit={onExit} />}
    </div>
  );
};
