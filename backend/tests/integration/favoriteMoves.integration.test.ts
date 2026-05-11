import request from 'supertest';
import jwt from 'jsonwebtoken';
import { RoleType } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

const signAccessToken = (payload: { id: number; role: RoleType }) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });

describe('Favorite move routes (integration)', () => {
  const favoriteRepo = {
    getFavoriteMoveIds: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  };

  const moveRepo = {
    getDanceMove: jest.fn(),
    getAllDanceMoves: jest.fn(),
    getDanceMovesByDifficulty: jest.fn(),
    createDanceMove: jest.fn(),
    updateDanceMove: jest.fn(),
    deleteDanceMove: jest.fn(),
    updateSubmissionStatus: jest.fn(),
    updatePoseData: jest.fn(),
    updatePoseStatus: jest.fn(),
    getChildMoves: jest.fn(),
    getParentMove: jest.fn(),
  };

  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    rebindRepositories({
      favoriteMoveRepository: favoriteRepo as any,
      danceMoveRepository: moveRepo as any,
    });
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /favorites', () => {
    it('401 without authentication', async () => {
      const res = await request(app).get('/favorites');
      expect(res.status).toBe(401);
    });

    it('returns the requester\'s favorite move ids', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      favoriteRepo.getFavoriteMoveIds.mockResolvedValue([1, 2, 3]);

      const res = await request(app)
        .get('/favorites')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual([1, 2, 3]);
      expect(favoriteRepo.getFavoriteMoveIds).toHaveBeenCalledWith(10);
    });
  });

  describe('POST /favorites/:moveId', () => {
    it('401 without authentication', async () => {
      const res = await request(app).post('/favorites/1');
      expect(res.status).toBe(401);
    });

    it('400 for non-positive move id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .post('/favorites/-1')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .post('/favorites/999')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
      expect(favoriteRepo.addFavorite).not.toHaveBeenCalled();
    });

    it('204 when the move is favorited', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({ id: 7 });
      favoriteRepo.addFavorite.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/favorites/7')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      // moveId arrives as a string from the URL parameter.
      expect(favoriteRepo.addFavorite).toHaveBeenCalledWith(10, '7');
    });

    it('400 when the repository throws an unexpected error', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({ id: 7 });
      favoriteRepo.addFavorite.mockRejectedValue(new Error('db down'));

      const res = await request(app)
        .post('/favorites/7')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /favorites/:moveId', () => {
    it('401 without authentication', async () => {
      const res = await request(app).delete('/favorites/1');
      expect(res.status).toBe(401);
    });

    it('400 for non-positive move id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .delete('/favorites/0')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('204 when the favorite is removed', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      favoriteRepo.removeFavorite.mockResolvedValue(1);

      const res = await request(app)
        .delete('/favorites/7')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(favoriteRepo.removeFavorite).toHaveBeenCalledWith(10, '7');
    });
  });
});
