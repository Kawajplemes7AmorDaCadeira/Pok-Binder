import { db } from '../database';
import { Card, CardPrint } from '../../types/db';

export class CardRepository {
  public static async saveCard(card: Card): Promise<void> {
    await db.cards.put(card);
  }

  public static async getCard(id: string): Promise<Card | undefined> {
    return db.cards.get(id);
  }

  public static async saveCardPrint(print: CardPrint): Promise<void> {
    await db.cardPrints.put(print);
  }

  public static async getCardPrint(id: string): Promise<CardPrint | undefined> {
    return db.cardPrints.get(id);
  }

  public static async getPrintsBySet(setId: string): Promise<CardPrint[]> {
    return db.cardPrints.where('setId').equals(setId).toArray();
  }

  public static async getPrintsByCard(cardId: string): Promise<CardPrint[]> {
    return db.cardPrints.where('cardId').equals(cardId).toArray();
  }

  public static async bulkSaveCards(cards: Card[]): Promise<void> {
    await db.cards.bulkPut(cards);
  }

  public static async bulkSaveCardPrints(prints: CardPrint[]): Promise<void> {
    await db.cardPrints.bulkPut(prints);
  }

  public static async countPrints(): Promise<number> {
    return db.cardPrints.count();
  }
}
