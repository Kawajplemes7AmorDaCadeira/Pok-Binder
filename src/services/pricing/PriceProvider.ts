import { CardCondition, CardMarketPrice, CardVariant, PokemonCard } from '../../types';
import { Currency } from '../../types/currency';

export interface PriceProvider {
  readonly id: string;
  readonly name: string;
  readonly nativeCurrency: Currency;
  getCardPrice(
    card: PokemonCard,
    variant: CardVariant,
    condition?: CardCondition
  ): Promise<CardMarketPrice | null>;
}
