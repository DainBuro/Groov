import _ from 'lodash';
import { injectable } from 'inversify';
import { Knex } from 'knex';
import { MoveOfSequence, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class MovesOfSequenceRepository extends BaseRepository {
  async getMovesOfSequence(sequenceId?: number): Promise<any[] | null> {
    if (_.isEmpty(sequenceId)) {
      return [];
    }

    const query = this.db()
      .select(
        'mos.*',
        'dm.name',
        'dm.difficulty',
        'dm.start_position',
        'dm.end_position',
        'dm.description as move_description'
      )
      .from(`${Table.MoveOfSequence} as mos`)
      .innerJoin(`${Table.DanceMove} as dm`, 'mos.move_id', 'dm.id')
      .where('mos.sequence_id', sequenceId)
      .orderBy('mos.order_index', 'asc');

    return query;
  }

  async deleteAllMovesOfSequence(sequenceId: number, trx?: Knex.Transaction): Promise<number> {
    if (_.isEmpty(sequenceId)) {
      return 0;
    }

    const result = await this.hardDelete(Table.MoveOfSequence, (query) => query.where('sequence_id', sequenceId), trx);

    return result;
  }

  async addMovesToSequence(sequenceId: number, moveIds: number[], trx?: Knex.Transaction): Promise<MoveOfSequence[]> {
    if (_.isEmpty(sequenceId) || _.isEmpty(moveIds)) {
      return [];
    }

    const movesOfSequence: Partial<MoveOfSequence>[] = moveIds.map((moveId, index) => ({
      sequence_id: sequenceId,
      move_id: moveId,
      order_index: index
    }));

    const result = await this.insert(Table.MoveOfSequence, movesOfSequence, trx);
    return result;
  }

  async replaceMovesOfSequence(
    sequenceId: number,
    moveIds: number[],
    trx?: Knex.Transaction
  ): Promise<MoveOfSequence[]> {
    if (_.isEmpty(sequenceId)) {
      return [];
    }

    return await this.usingTransaction(async (transaction) => {
      await this.deleteAllMovesOfSequence(sequenceId, transaction);

      if (!_.isEmpty(moveIds)) {
        return await this.addMovesToSequence(sequenceId, moveIds, transaction);
      }

      return [];
    }, trx);
  }
}
