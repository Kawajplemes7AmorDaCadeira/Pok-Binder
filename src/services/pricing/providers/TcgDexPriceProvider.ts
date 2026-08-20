import { CardCondition, CardMarketPrice, CardVariant, PokemonCard } from '../../../types';
import { Currency } from '../../../types/currency';
import { CardMarketMatcher } from '../CardMarketMatcher';
import { CurrencyConversionService } from '../CurrencyConversionService';
import { PriceProvider } from '../PriceProvider';

export class TcgDexPriceProvider implements PriceProvider {
  readonly id = 'tcgdex_pricing';
  readonly name = 'Cardmarket / TCG';
  readonly nativeCurrency: Currency = 'USD';

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

      const usdPrice = card.pricing?.usd?.market || card.pricing?.usd?.low;
      if (!usdPrice || usdPrice <= 0) {
        return null;
      }

      const converted = CurrencyConversionService.convert({
        amount: usdPrice,
        currency: 'USD',
      }, 'BRL');

      return {
        cardId: card.id,
        source: this.name,
        variant,
        condition,
        currency: 'BRL',
        lowest: converted.amount,
        average: converted.amount,
        highest: converted.amount,
        listings: 15,
        confidenceScore: matchResult.score,
        matchDetails: matchResult.matchDetails,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('TcgDexPriceProvider error', e);
      return null;
    }
  }
}
