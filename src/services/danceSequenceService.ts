import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { DanceMove, DanceSequence } from '../schema';
import { TYPES } from '../ioc/types';
import { DanceSequenceRepository } from '../repositories/danceSequenceRepository';

@injectable()
export class DanceSequenceService {
  constructor(@inject(TYPES.danceSequenceRepository) private danceSequenceRepository: DanceSequenceRepository) {}
  async getDanceSequence(id: number): Promise<DanceSequence | null> {
    return this.danceSequenceRepository.getDanceSequence(id);
  }

  async getAllDanceSequences(): Promise<DanceSequence[]> {
    return this.danceSequenceRepository.getAllDanceSequences();
  }

  async createDanceSequence(data: Partial<DanceSequence>): Promise<DanceSequence> {
    if (!data.name || !data.user_id || !data.description) {
      throw new Error('Missing required fields to create a dance sequence.');
    }
    return this.danceSequenceRepository.createDanceSequence(data);
  }

  async updateDanceSequence(id: number, data: Partial<DanceSequence>): Promise<DanceSequence | null> {
    const existing = await this.danceSequenceRepository.getDanceSequence(id);
    if (!existing) {
      throw new Error(`Dance sequence with ID ${id} not found.`);
    }
    if (existing.user_id !== data.user_id) {
      throw new Error(`Dance sequence with ID ${id} is not accesible.`);
    }
    return this.danceSequenceRepository.updateDanceSequence({ ...data, id });
  }

  async deleteDanceSequence(id: number, user_id: number): Promise<any> {
    const existing = await this.danceSequenceRepository.getDanceSequence(id);
    if (!existing) {
      throw new Error(`Dance sequence with ID ${id} not found.`);
    }
    if (existing.user_id !== user_id) {
      throw new Error(`Dance sequence with ID ${id} is not accesible.`);
    }
    return this.danceSequenceRepository.deleteDanceSequence(id);
  }
}
