import _ from 'lodash';
import { injectable } from 'inversify';
import { AppUser, DanceMove, PoseStatusEnum, RefreshToken, Table } from '../schema';
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

  async getAllDanceMoves(search?: string): Promise<(Omit<DanceMove, 'pose_data'> & { has_pose_data: boolean })[]> {
    const db = this.database.db();
    let query = db(Table.DanceMove)
      .select(
        'id', 'name', 'description', 'difficulty',
        'start_position', 'end_position', 'parent_move_id', 'pose_file_name',
        'pose_status', 'pose_error', 'youtube_url',
        db.raw('pose_data IS NOT NULL as has_pose_data')
      );

    if (search) {
      query = query.where('name', 'ilike', `%${search}%`);
    }

    return query.orderBy('name', 'asc');
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

  async updatePoseData(id: number, poseData: string | null, fileName: string | null): Promise<DanceMove | null> {
    const [updated] = await this.database.db()(Table.DanceMove)
      .where('id', id)
      .update({ pose_data: poseData, pose_file_name: fileName })
      .returning('*');
    return updated || null;
  }

  async updatePoseStatus(id: number, status: PoseStatusEnum | null, error: string | null): Promise<DanceMove | null> {
    const [updated] = await this.database.db()(Table.DanceMove)
      .where('id', id)
      .update({ pose_status: status, pose_error: error })
      .returning('*');
    return updated || null;
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
