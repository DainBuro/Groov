import { injectable } from 'inversify';
import { FavoriteMove, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class FavoriteMoveRepository extends BaseRepository {
  async getFavoriteMoveIds(userId: number): Promise<number[]> {
    const rows = await this.get<FavoriteMove>(Table.FavoriteMove, ['move_id'], (query) =>
      query.where('user_id', userId)
    );
    return rows.map((r) => r.move_id);
  }

  async addFavorite(userId: number, moveId: number): Promise<void> {
    await this.database.db()(Table.FavoriteMove)
      .insert({ user_id: userId, move_id: moveId })
      .onConflict(['user_id', 'move_id'])
      .ignore();
  }

  async removeFavorite(userId: number, moveId: number): Promise<number> {
    return this.database.db()(Table.FavoriteMove)
      .where({ user_id: userId, move_id: moveId })
      .delete();
  }
}
