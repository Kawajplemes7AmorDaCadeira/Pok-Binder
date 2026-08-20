import { CardProvider } from '../../services/cardProvider';
import { CardLanguage } from '../../types';
import { NotFoundError } from '../errors/AppError';

export interface CardSearchQuery {
  searchQuery?: string;
  setId?: string;
  type?: string;
  rarity?: string;
  artist?: string;
  lang?: CardLanguage;
}

export class CardService {
  public static async getSets(lang: CardLanguage = 'pt') {
    return await CardProvider.getSets(lang);
  }

  public static async getSetById(id: string, lang: CardLanguage = 'pt') {
    const setInfo = await CardProvider.getSetById(id, lang);
    if (!setInfo) {
      throw new NotFoundError(`Set with ID '${id}' was not found`);
    }
    return setInfo;
  }

  public static async getCardsBySet(setId: string, lang: CardLanguage = 'pt') {
    return await CardProvider.getCardsBySet(setId, lang);
  }

  public static async getCardById(id: string, lang: CardLanguage = 'pt') {
    const card = await CardProvider.getCardById(id, lang);
    if (!card) {
      throw new NotFoundError(`Card with ID '${id}' was not found`);
    }
    return card;
  }

  public static async searchCards(query: CardSearchQuery, lang: CardLanguage = 'pt') {
    return await CardProvider.searchCards(
      {
        searchQuery: query.searchQuery || '',
        setId: query.setId,
        type: query.type,
        rarity: query.rarity,
        artist: query.artist,
      },
      lang
    );
  }
}
