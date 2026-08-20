/**
 * BattleWrapper.tsx - Manages switching between BattleLobby and BattleArena.
 */

import React, { useState } from 'react';
import { BattleController } from '../../game/engine/BattleController';
import { BattleLobby } from './BattleLobby';
import { BattleArena } from './BattleArena';

export const BattleWrapper: React.FC = () => {
  const [controller, setController] = useState<BattleController | null>(null);

  const handleStartBattle = (botMode: 'EASY' | 'NORMAL' | 'NONE') => {
    // Default starter decks for P1 and P2
    const deckP1 = [
      'p1-basic-charmander', 'p1-basic-charmander', 'p1-stage1-charmeleon', 'p1-energy-fire', 'p1-energy-fire',
      'p1-trainer-item-1', 'p1-trainer-item-2', 'p1-trainer-supporter-1'
    ];
    for (let i = 9; i <= 60; i++) {
      deckP1.push(`p1-filler-${i}`);
    }

    const deckP2 = [
      'p2-basic-pikachu', 'p2-basic-pikachu', 'p2-stage1-raichu', 'p2-energy-lightning', 'p2-energy-lightning',
      'p2-trainer-item-1', 'p2-trainer-item-2', 'p2-trainer-supporter-1'
    ];
    for (let i = 9; i <= 60; i++) {
      deckP2.push(`p2-filler-${i}`);
    }

    const newController = BattleController.createNewGame(deckP1, deckP2, botMode);
    setController(newController);
  };

  if (!controller) {
    return <BattleLobby onStartBattle={handleStartBattle} />;
  }

  return <BattleArena controller={controller} onExit={() => setController(null)} />;
};
