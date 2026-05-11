import { FavoriteMoveService } from '../../../src/services/favoriteMoveService';
import { FavoriteMoveRepository } from '../../../src/repositories/favoriteMoveRepository';
import { DanceMoveRepository } from '../../../src/repositories/danceMoveRepository';

const makeFavoriteRepo = (): jest.Mocked<Partial<FavoriteMoveRepository>> => ({
  getFavoriteMoveIds: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
});

const makeMoveRepo = (): jest.Mocked<Partial<DanceMoveRepository>> => ({
  getDanceMove: jest.fn(),
});

describe('FavoriteMoveService', () => {
  let favoriteRepo: jest.Mocked<Partial<FavoriteMoveRepository>>;
  let moveRepo: jest.Mocked<Partial<DanceMoveRepository>>;
  let service: FavoriteMoveService;

  beforeEach(() => {
    favoriteRepo = makeFavoriteRepo();
    moveRepo = makeMoveRepo();
    service = new FavoriteMoveService(
      favoriteRepo as unknown as FavoriteMoveRepository,
      moveRepo as unknown as DanceMoveRepository
    );
  });

  describe('getFavoriteMoveIds', () => {
    it('delegates to the favorite repository', async () => {
      favoriteRepo.getFavoriteMoveIds!.mockResolvedValue([1, 2, 3]);

      const result = await service.getFavoriteMoveIds(42);

      expect(result).toEqual([1, 2, 3]);
      expect(favoriteRepo.getFavoriteMoveIds).toHaveBeenCalledWith(42);
    });
  });

  describe('addFavorite', () => {
    it('throws when the move does not exist', async () => {
      moveRepo.getDanceMove!.mockResolvedValue(null);

      await expect(service.addFavorite(10, 99)).rejects.toThrow(/not found/);
      expect(favoriteRepo.addFavorite).not.toHaveBeenCalled();
    });

    it('adds the favorite when the move exists', async () => {
      moveRepo.getDanceMove!.mockResolvedValue({ id: 7 } as any);

      await service.addFavorite(10, 7);

      expect(favoriteRepo.addFavorite).toHaveBeenCalledWith(10, 7);
    });
  });

  describe('removeFavorite', () => {
    it('delegates to the favorite repository', async () => {
      favoriteRepo.removeFavorite!.mockResolvedValue(undefined as any);

      await service.removeFavorite(10, 7);

      expect(favoriteRepo.removeFavorite).toHaveBeenCalledWith(10, 7);
    });
  });
});
