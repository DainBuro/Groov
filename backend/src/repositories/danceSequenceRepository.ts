import _ from 'lodash';
import { injectable } from 'inversify';
import { DanceSequence, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class DanceSequenceRepository extends BaseRepository {
  async getDanceSequence(id?: number): Promise<any | null> {
    if (_.isEmpty(id)) {
      return null;
    }
    const [sequence] = await this.get<any>(
      Table.DanceSequence,
      [
        `${Table.DanceSequence}.*`,
        'app_user.username as creator_username'
      ],
      (query) => {
        query
          .leftJoin('app_user', `${Table.DanceSequence}.creator_id`, 'app_user.id')
          .where(`${Table.DanceSequence}.id`, id);
      }
    );
    return sequence || null;
  }

  async getAllDanceSequences(search?: string, creatorId?: number): Promise<any[]> {
    return this.get<any>(
      Table.DanceSequence,
      [
        `${Table.DanceSequence}.*`,
        'app_user.username as creator_username'
      ],
      (query) => {
        query.leftJoin('app_user', `${Table.DanceSequence}.creator_id`, 'app_user.id');
        if (search) {
          query.where(`${Table.DanceSequence}.name`, 'ilike', `%${search}%`);
        }
        if (creatorId) {
          query.where(`${Table.DanceSequence}.creator_id`, creatorId);
        }
        return query.orderBy(`${Table.DanceSequence}.id`, 'desc');
      }
    );
  }

  async createDanceSequence(data: Partial<DanceSequence>): Promise<DanceSequence> {
    const [inserted] = await this.insert<DanceSequence>(Table.DanceSequence, [data]);
    return inserted;
  }

  async updateDanceSequence(data: Partial<DanceSequence>): Promise<DanceSequence | null> {
    const [updated] = await this.upsert<DanceSequence>(Table.DanceSequence, [data]);
    return updated || null;
  }

  async deleteDanceSequence(id: number): Promise<boolean> {
    const deleted = await this.hardDelete(Table.DanceSequence, (query) => query.where('id', id));
    return deleted;
  }
}
