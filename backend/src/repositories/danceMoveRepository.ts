import _ from 'lodash';
import { injectable } from 'inversify';
import { DanceMove, PoseStatusEnum, SubmissionStatusEnum, Table } from '../schema';
import { BaseRepository } from './baseRepository';

export interface DanceMoveListItem extends Omit<DanceMove, 'pose_data'> {
  has_pose_data: boolean;
  creator_username?: string | null;
}

@injectable()
export class DanceMoveRepository extends BaseRepository {
  async getDanceMove(id?: number): Promise<DanceMove | null> {
    if (_.isEmpty(id)) {
      return null;
    }
    const [move] = await this.get<DanceMove>(Table.DanceMove, '*', (query) => query.where('id', id));
    return move || null;
  }

  async getAllDanceMoves(options: {
    search?: string;
    statuses?: SubmissionStatusEnum[];
    creatorId?: number;
    includeOwnedBy?: number;
  } = {}): Promise<DanceMoveListItem[]> {
    const db = this.database.db();
    let query = db(`${Table.DanceMove} as dm`)
      .leftJoin(`${Table.AppUser} as u`, 'u.id', 'dm.created_by')
      .select(
        'dm.id', 'dm.name', 'dm.description', 'dm.difficulty',
        'dm.start_position', 'dm.end_position', 'dm.parent_move_id', 'dm.pose_file_name',
        'dm.pose_status', 'dm.pose_error', 'dm.youtube_url',
        'dm.submission_status', 'dm.created_by', 'dm.rejection_reason',
        'u.username as creator_username',
        db.raw('dm.pose_data IS NOT NULL as has_pose_data')
      );

    if (options.search) {
      query = query.where('dm.name', 'ilike', `%${options.search}%`);
    }

    if (options.creatorId) {
      query = query.where('dm.created_by', options.creatorId);
    }

    if (options.statuses && options.statuses.length > 0) {
      if (options.includeOwnedBy) {
        query = query.where((qb) => {
          qb.whereIn('dm.submission_status', options.statuses!)
            .orWhere('dm.created_by', options.includeOwnedBy!);
        });
      } else {
        query = query.whereIn('dm.submission_status', options.statuses);
      }
    }

    return query.orderBy('dm.name', 'asc');
  }

  async getDanceMovesByDifficulty(difficulty: string, approvedOnly = true): Promise<DanceMove[]> {
    return this.get<DanceMove>(Table.DanceMove, '*', (query) => {
      query.where('difficulty', difficulty);
      if (approvedOnly) {
        query.andWhere('submission_status', SubmissionStatusEnum.Approved);
      }
    });
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

  async getChildMoves(parentMoveId: number, approvedOnly = true): Promise<DanceMove[]> {
    return this.get<DanceMove>(Table.DanceMove, '*', (query) => {
      query.where('parent_move_id', parentMoveId);
      if (approvedOnly) {
        query.andWhere('submission_status', SubmissionStatusEnum.Approved);
      }
    });
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

  async updateSubmissionStatus(
    id: number,
    status: SubmissionStatusEnum,
    rejectionReason: string | null = null
  ): Promise<DanceMove | null> {
    const [updated] = await this.database.db()(Table.DanceMove)
      .where('id', id)
      .update({ submission_status: status, rejection_reason: rejectionReason })
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
