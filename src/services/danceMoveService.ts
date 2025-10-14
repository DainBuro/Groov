import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { DanceMove, DifficultyEnum } from '../schema';
import { DanceMoveRepository } from '../repositories/danceMoveRepository';
import { TYPES } from '../ioc/types';

@injectable()
export class DanceMoveService {
  constructor(@inject(TYPES.danceMoveRepository) private danceMoveRepository: DanceMoveRepository) {}
  async getDanceMove(id: number): Promise<DanceMove | null> {
    return this.danceMoveRepository.getDanceMove(id);
  }

  async getAllDanceMoves(): Promise<DanceMove[]> {
    return this.danceMoveRepository.getAllDanceMoves();
  }

  async getDanceMovesByDifficulty(difficulty: DifficultyEnum): Promise<DanceMove[]> {
    return this.danceMoveRepository.getDanceMovesByDifficulty(difficulty);
  }

  async createDanceMove(data: Partial<DanceMove>): Promise<DanceMove> {
    if (!data.name || !data.difficulty || !data.start_position || !data.end_position) {
      throw new Error('Missing required fields to create a dance move.');
    }
    const { id, ...safeData } = data;

    return this.danceMoveRepository.createDanceMove(safeData);
  }

  async updateDanceMove(id: number, data: Partial<DanceMove>): Promise<DanceMove | null> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.updateDanceMove({ ...data, id });
  }

  async deleteDanceMove(id: number): Promise<any> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.deleteDanceMove(id);
  }

  async getChildMoves(parentMoveId: number): Promise<DanceMove[]> {
    return this.danceMoveRepository.getChildMoves(parentMoveId);
  }

  async getParentMove(childMoveId: number): Promise<DanceMove | null> {
    return this.danceMoveRepository.getParentMove(childMoveId);
  }
}
