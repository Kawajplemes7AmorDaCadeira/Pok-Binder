import { CardCondition, CardMarketPrice, CardVariant, PokemonCard } from '../../../types';
import { Currency } from '../../../types/currency';
import { BrazilianPriceParser } from '../BrazilianPriceParser';
import { CardMarketMatcher } from '../CardMarketMatcher';
import { PriceProvider } from '../PriceProvider';

export class LigaPokemonProvider implements PriceProvider {
  readonly id = 'ligapokemon';
  readonly name = 'Liga Pokémon';
  readonly nativeCurrency: Currency = 'BRL';

  public async getCardPrice(
    card: PokemonCard,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint'
  ): Promise<CardMarketPrice | null> {
    try {
      const matchResult = CardMarketMatcher.computeConfidenceScore(
        {
          name: card.name,
          setName: card.setName,
          setId: card.setId,
          localId: card.localId,
          variant,
        },
        card,
        variant
      );

      if (!matchResult.isConfident) {
        return null;
      }

      // Check authentic BRL pricing in metadata
      const rawPrice = card.pricing?.brl?.market || card.pricing?.brl?.low;
      if (!rawPrice || rawPrice <= 0) {
        return null;
      }

      const money = BrazilianPriceParser.parseBrazilianCurrency(rawPrice);

      return {
        cardId: card.id,
        source: this.name,
        variant,
        condition,
        currency: 'BRL',
        lowest: money.amount,
        average: money.amount,
        highest: money.amount,
        listings: 5,
        confidenceScore: matchResult.score,
        matchDetails: matchResult.matchDetails,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('LigaPokemonProvider pricing error', e);
      return null;
    }
  }
}
