import _ from 'lodash';
import { injectable } from 'inversify';
import { AppUser, DanceMove, RefreshToken, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class DanceMoveRepository extends BaseRepository {
  async getDanceMove(id?: number): Promise<DanceMove | null> {
    if (_.isEmpty(id)) {
      return null;
    }
    const [move] = await this.get<DanceMove>(Table.DanceMove, '*', (query) => query.where('id', id));
    return move || null;
  }

  async getAllDanceMoves(): Promise<DanceMove[]> {
    return this.get<DanceMove>(Table.DanceMove, '*');
  }

  async getDanceMovesByDifficulty(difficulty: string): Promise<DanceMove[]> {
    return this.get<DanceMove>(Table.DanceMove, '*', (query) => query.where('difficulty', difficulty));
  }

  async createDanceMove(data: Partial<DanceMove>): Promise<DanceMove> {
    const [inserted] = await this.insert<DanceMove>(Table.DanceMove, [data]);
    return inserted;
  }

  async updateDanceMove(data: Partial<DanceMove>): Promise<DanceMove | null> {
    const [updated] = await this.upsert<DanceMove>(Table.DanceMove, [data]);
    return updated || null;
  }

  async deleteDanceMove(id: number): Promise<boolean> {
    const deleted = await this.hardDelete(Table.DanceMove, (query) => query.where('id', id));
    return deleted;
  }

  async getChildMoves(parentMoveId: number): Promise<DanceMove[]> {
    return this.get<DanceMove>(Table.DanceMove, '*', (query) => query.where('parent_move_id', parentMoveId));
  }

  async getParentMove(childMoveId: number): Promise<DanceMove | null> {
    const [parent] = await this.get<DanceMove>(Table.DanceMove, '*', (query) =>
      query
        .join(`${Table.DanceMove} as parent`, 'parent.id', '=', `${Table.DanceMove}.parent_move_id`)
        .where(`${Table.DanceMove}.id`, childMoveId)
        .select('parent.*')
    );
    return parent || null;
  }
}
