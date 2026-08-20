import { db } from '../database';
import { SeriesEntity, SetEntity } from '../../types/db';

export class SetRepository {
  public static async saveSet(set: SetEntity): Promise<void> {
    await db.sets.put(set);
  }

  public static async getSet(id: string): Promise<SetEntity | undefined> {
    return db.sets.get(id);
  }

  public static async getAllSets(): Promise<SetEntity[]> {
    return db.sets.toArray();
  }

  public static async saveSeries(series: SeriesEntity): Promise<void> {
    await db.series.put(series);
  }

  public static async getAllSeries(): Promise<SeriesEntity[]> {
    return db.series.toArray();
  }

  public static async bulkSaveSets(sets: SetEntity[]): Promise<void> {
    await db.sets.bulkPut(sets);
  }

  public static async bulkSaveSeries(series: SeriesEntity[]): Promise<void> {
    await db.series.bulkPut(series);
  }
}
