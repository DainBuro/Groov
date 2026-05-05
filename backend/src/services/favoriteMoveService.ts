import { inject, injectable } from 'inversify';
import { TYPES } from '../ioc/types';
import { FavoriteMoveRepository } from '../repositories/favoriteMoveRepository';
import { DanceMoveRepository } from '../repositories/danceMoveRepository';

@injectable()
export class FavoriteMoveService {
  constructor(
    @inject(TYPES.favoriteMoveRepository) private favoriteMoveRepository: FavoriteMoveRepository,
    @inject(TYPES.danceMoveRepository) private danceMoveRepository: DanceMoveRepository
  ) {}

  async getFavoriteMoveIds(userId: number): Promise<number[]> {
    return this.favoriteMoveRepository.getFavoriteMoveIds(userId);
  }

  async addFavorite(userId: number, moveId: number): Promise<void> {
    const move = await this.danceMoveRepository.getDanceMove(moveId);
    if (!move) {
      throw new Error(`Dance move with ID ${moveId} not found.`);
    }
    await this.favoriteMoveRepository.addFavorite(userId, moveId);
  }

  async removeFavorite(userId: number, moveId: number): Promise<void> {
    await this.favoriteMoveRepository.removeFavorite(userId, moveId);
  }
}
