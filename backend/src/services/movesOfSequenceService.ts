import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { Knex } from 'knex';
import { MoveOfSequence } from '../schema';
import { TYPES } from '../ioc/types';
import { MovesOfSequenceRepository } from '../repositories/movesOfSequenceRepository';
import { DanceSequenceRepository } from '../repositories/danceSequenceRepository';

@injectable()
export class MovesOfSequenceService {
  constructor(
    @inject(TYPES.movesOfSequenceRepository)
    private movesOfSequenceRepository: MovesOfSequenceRepository,
    @inject(TYPES.danceSequenceRepository)
    private danceSequenceRepository: DanceSequenceRepository
  ) {}

  async getMovesOfSequence(id: number): Promise<MoveOfSequence[] | null> {
    return this.movesOfSequenceRepository.getMovesOfSequence(id);
  }

  async deleteAllMovesOfSequence(sequenceId: number, userId: number, trx?: Knex.Transaction): Promise<number> {
    const sequence = await this.danceSequenceRepository.getDanceSequence(sequenceId);
    if (_.isEmpty(sequenceId)) {
      throw new Error('Sequence ID is required');
    }
    if (!sequence) {
      throw new Error('Dance sequence not found');
    }
    if (sequence.user_id !== userId) {
      throw new Error('Unauthorized to delete moves from this sequence');
    }
    return this.movesOfSequenceRepository.deleteAllMovesOfSequence(sequenceId, trx);
  }

  async replaceMovesOfSequence(
    sequenceId: number,
    moveIds: number[],
    userId: number,
    trx?: Knex.Transaction
  ): Promise<MoveOfSequence[]> {
    const sequence = await this.danceSequenceRepository.getDanceSequence(sequenceId);
    if (_.isEmpty(sequenceId)) {
      throw new Error('Sequence ID is required');
    }
    if (!sequence) {
      throw new Error('Dance sequence not found');
    }
    if (sequence.user_id !== userId) {
      throw new Error('Unauthorized to delete moves from this sequence');
    }

    return this.movesOfSequenceRepository.replaceMovesOfSequence(sequenceId, moveIds, trx);
  }
}
