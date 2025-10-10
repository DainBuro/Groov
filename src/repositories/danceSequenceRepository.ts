import _ from 'lodash';
import { injectable } from 'inversify';
import { DanceSequence, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class DanceSequenceRepository extends BaseRepository {
  async getDanceSequence(id?: number): Promise<DanceSequence | null> {
    if (_.isEmpty(id)) {
      return null;
    }
    const [sequence] = await this.get<DanceSequence>(Table.DanceSequence, '*', (query) => query.where('id', id));
    return sequence || null;
  }

  async getAllDanceSequences(): Promise<DanceSequence[]> {
    return this.get<DanceSequence>(Table.DanceSequence, '*');
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
