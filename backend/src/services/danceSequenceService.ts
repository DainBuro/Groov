import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { DanceMove, DanceSequence, RoleType } from '../schema';
import { TYPES } from '../ioc/types';
import { DanceSequenceRepository } from '../repositories/danceSequenceRepository';

@injectable()
export class DanceSequenceService {
  constructor(@inject(TYPES.danceSequenceRepository) private danceSequenceRepository: DanceSequenceRepository) {}
  async getDanceSequence(id: number): Promise<DanceSequence | null> {
    return this.danceSequenceRepository.getDanceSequence(id);
  }

  async getAllDanceSequences(search?: string, creatorId?: number): Promise<DanceSequence[]> {
    return this.danceSequenceRepository.getAllDanceSequences(search, creatorId);
  }

  async createDanceSequence(data: Partial<DanceSequence>): Promise<DanceSequence> {
    if (!data.name || !data.user_id) {
      throw new Error('Missing required fields to create a dance sequence.');
    }
    const { id, ...safeData } = data;

    const sequenceData = {
      ...safeData,
      user_id: safeData.user_id || data.user_id
    };

    return this.danceSequenceRepository.createDanceSequence(sequenceData);
  }

  async updateDanceSequence(
    id: number,
    data: Partial<DanceSequence>,
    userRole?: RoleType
  ): Promise<DanceSequence | null> {
    const existing = await this.danceSequenceRepository.getDanceSequence(id);
    if (!existing) {
      throw new Error(`Dance sequence with ID ${id} not found.`);
    }
    // Allow update if user is creator or admin
    if (existing.user_id !== data.user_id && userRole !== RoleType.Admin) {
      throw new Error(`Dance sequence with ID ${id} is not accessible.`);
    }
    return this.danceSequenceRepository.updateDanceSequence({ ...data, id });
  }

  async deleteDanceSequence(id: number, user_id: number, userRole?: RoleType): Promise<any> {
    const existing = await this.danceSequenceRepository.getDanceSequence(id);
    if (!existing) {
      throw new Error(`Dance sequence with ID ${id} not found.`);
    }
    // Allow delete if user is creator or admin
    if (existing.user_id !== user_id && userRole !== RoleType.Admin) {
      throw new Error(`Dance sequence with ID ${id} is not accessible.`);
    }
    return this.danceSequenceRepository.deleteDanceSequence(id);
  }
}
