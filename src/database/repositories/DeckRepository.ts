import { db } from '../database';
import { DeckEntity } from '../../types/db';

export class DeckRepository {
  public static async getAll(): Promise<DeckEntity[]> {
    return db.decks.filter((d) => !d.deletedAt).toArray();
  }

  public static async getById(id: string): Promise<DeckEntity | undefined> {
    return db.decks.get(id);
  }

  public static async save(deck: DeckEntity): Promise<DeckEntity[]> {
    const updated = {
      ...deck,
      updatedAt: new Date().toISOString(),
    };
    await db.decks.put(updated);
    return this.getAll();
  }

  public static async delete(id: string): Promise<DeckEntity[]> {
    const existing = await db.decks.get(id);
    if (existing) {
      await db.decks.update(id, {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return this.getAll();
  }

  public static async bulkSave(decks: DeckEntity[]): Promise<void> {
    await db.decks.bulkPut(decks);
  }
}
