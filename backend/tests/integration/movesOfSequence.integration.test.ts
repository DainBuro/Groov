import request from 'supertest';
import jwt from 'jsonwebtoken';
import { RoleType } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

const signAccessToken = (payload: { id: number; role: RoleType }) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });

describe('Moves-of-sequence routes (integration)', () => {
  const sequenceRepo = {
    getDanceSequence: jest.fn(),
    getAllDanceSequences: jest.fn(),
    createDanceSequence: jest.fn(),
    updateDanceSequence: jest.fn(),
    deleteDanceSequence: jest.fn(),
  };

  const movesRepo = {
    getMovesOfSequence: jest.fn(),
    deleteAllMovesOfSequence: jest.fn(),
    addMovesToSequence: jest.fn(),
    replaceMovesOfSequence: jest.fn(),
  };

  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    rebindRepositories({
      danceSequenceRepository: sequenceRepo as any,
      movesOfSequenceRepository: movesRepo as any,
    });
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sequence-moves/:id', () => {
    it('400 for non-positive id', async () => {
      const res = await request(app).get('/sequence-moves/-3');
      expect(res.status).toBe(400);
    });

    it('404 when the sequence does not exist', async () => {
      sequenceRepo.getDanceSequence.mockResolvedValue(null);
      const res = await request(app).get('/sequence-moves/9');
      expect(res.status).toBe(404);
    });

    it('200 with the moves for the sequence', async () => {
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1 });
      movesRepo.getMovesOfSequence.mockResolvedValue([
        { sequence_id: 1, move_id: 5, order_index: 0 },
      ]);

      const res = await request(app).get('/sequence-moves/1');

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toHaveLength(1);
    });
  });

  describe('PUT /sequence-moves/:sequenceId', () => {
    it('401 without authentication', async () => {
      const res = await request(app).put('/sequence-moves/1').send({ moveIds: [1] });
      expect(res.status).toBe(401);
    });

    it('400 for non-positive sequence id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/sequence-moves/0')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: [1] });
      expect(res.status).toBe(400);
    });

    it('400 when body is empty', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });

    it('400 when moveIds is not an array', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: 'oops' });
      expect(res.status).toBe(400);
    });

    it('400 when moveIds contains a non-positive integer', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: [1, 0, 2] });
      expect(res.status).toBe(400);
    });

    it('404 when the sequence does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue(null);

      const res = await request(app)
        .put('/sequence-moves/9')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: [1] });

      expect(res.status).toBe(404);
    });

    it('403 when caller is not the owner', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 99 });

      const res = await request(app)
        .put('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: [1, 2] });

      expect(res.status).toBe(403);
      expect(movesRepo.replaceMovesOfSequence).not.toHaveBeenCalled();
    });

    it('200 when owner replaces moves', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 10 });
      movesRepo.replaceMovesOfSequence.mockResolvedValue([
        { sequence_id: 1, move_id: 5, order_index: 0 },
      ]);

      const res = await request(app)
        .put('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ moveIds: [5] });

      expect(res.status).toBe(200);
      // sequenceId arrives as a string from the URL parameter; trx is undefined.
      expect(movesRepo.replaceMovesOfSequence).toHaveBeenCalledWith('1', [5], undefined);
    });
  });

  describe('DELETE /sequence-moves/:sequenceId', () => {
    it('401 without authentication', async () => {
      const res = await request(app).delete('/sequence-moves/1');
      expect(res.status).toBe(401);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .delete('/sequence-moves/-1')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('404 when the sequence does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue(null);

      const res = await request(app)
        .delete('/sequence-moves/9')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('403 when caller is not the owner', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 99 });

      const res = await request(app)
        .delete('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(403);
      expect(movesRepo.deleteAllMovesOfSequence).not.toHaveBeenCalled();
    });

    it('204 when owner deletes the moves', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 10 });
      movesRepo.deleteAllMovesOfSequence.mockResolvedValue(3);

      const res = await request(app)
        .delete('/sequence-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(movesRepo.deleteAllMovesOfSequence).toHaveBeenCalledWith('1', undefined);
    });
  });
});
