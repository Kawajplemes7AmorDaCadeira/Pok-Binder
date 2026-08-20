/**
 * SetupScreen.tsx - UI for match setup (Active Pokémon selection and confirm).
 */

import React from 'react';
import { SanitizedGameView } from '../../../game/engine/PlayerView';

interface SetupScreenProps {
  view: SanitizedGameView;
  onAction: (action: any) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ view, onAction }) => {
  const player = view.players[view.viewingPlayerId];
  const hasActive = !!player.activePokemon;

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
        <h2 className="text-2xl font-extrabold text-red-500 mb-2">Setup da Partida</h2>
        <p className="text-slate-400 mb-6">
          {!hasActive ? 'Escolha seu Pokémon Ativo inicial clicando em uma carta básica da sua mão.' : 'Seu Pokémon Ativo está definido. Confirme o setup para iniciar!'}
        </p>

        {!hasActive && player.hand && (
          <div className="grid grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto p-2 bg-slate-950 rounded-xl">
            {player.hand.map((card) => (
              <div
                key={card.instanceId}
                onClick={() =>
                  onAction({
                    actionId: `act_${Date.now()}`,
                    type: 'SET_ACTIVE_POKEMON',
                    playerId: view.viewingPlayerId,
                    cardInstanceId: card.instanceId,
                  })
                }
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 cursor-pointer text-xs transition-transform hover:scale-105"
              >
                <div className="font-bold text-red-300">{card.cardId}</div>
              </div>
            ))}
          </div>
        )}

        {hasActive && (
          <button
            onClick={() =>
              onAction({
                actionId: `act_${Date.now()}`,
                type: 'CONFIRM_SETUP',
                playerId: view.viewingPlayerId,
              })
            }
            className="px-6 py-3 bg-red-600 hover:bg-red-500 font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all"
          >
            Confirmar Setup e Iniciar
          </button>
        )}
      </div>
    </div>
  );
};
