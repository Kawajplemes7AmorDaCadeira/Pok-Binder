import React from 'react';
import { CardScanner } from './CardScanner';
import { CardLanguage, CardVariant, PokemonCard } from '../../types';

interface CameraCardScannerProps {
  isOpen: boolean;
  onClose: () => void;
  preferredLanguage: CardLanguage;
  onCardAddedToCollection?: (card: PokemonCard, variant: CardVariant) => void;
  onSelectCardDetail?: (card: PokemonCard) => void;
}

export const CameraCardScanner: React.FC<CameraCardScannerProps> = (props) => {
  return <CardScanner {...props} />;
};
