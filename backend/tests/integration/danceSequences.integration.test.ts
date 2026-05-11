import request from 'supertest';
import jwt from 'jsonwebtoken';
import { RoleType } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

const signAccessToken = (payload: { id: number; role: RoleType }) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });

describe('Dance sequence routes (integration)', () => {
  const sequenceRepo = {
    getDanceSequence: jest.fn(),
    getAllDanceSequences: jest.fn(),
    createDanceSequence: jest.fn(),
    updateDanceSequence: jest.fn(),
    deleteDanceSequence: jest.fn(),
  };

  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    rebindRepositories({ danceSequenceRepository: sequenceRepo as any });
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dance-sequences', () => {
    it('returns the list of sequences', async () => {
      sequenceRepo.getAllDanceSequences.mockResolvedValue([{ id: 1, name: 'My seq' }]);

      const res = await request(app).get('/dance-sequences');

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual([{ id: 1, name: 'My seq' }]);
      expect(sequenceRepo.getAllDanceSequences).toHaveBeenCalledWith(undefined, undefined);
    });

    it('forwards search and creatorId filters', async () => {
      sequenceRepo.getAllDanceSequences.mockResolvedValue([]);

      await request(app).get('/dance-sequences?search=jam&creatorId=7').expect(200);

      expect(sequenceRepo.getAllDanceSequences).toHaveBeenCalledWith('jam', '7');
    });
  });

  describe('GET /dance-sequences/my', () => {
    it('401 without auth', async () => {
      const res = await request(app).get('/dance-sequences/my');
      expect(res.status).toBe(401);
    });

    it('filters by the requester id when authenticated', async () => {
      const token = signAccessToken({ id: 42, role: RoleType.User });
      sequenceRepo.getAllDanceSequences.mockResolvedValue([]);

      const res = await request(app)
        .get('/dance-sequences/my?search=swing')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(sequenceRepo.getAllDanceSequences).toHaveBeenCalledWith('swing', 42);
    });
  });

  describe('GET /dance-sequences/:id', () => {
    it('400 for non-positive id', async () => {
      const res = await request(app).get('/dance-sequences/-1');
      expect(res.status).toBe(400);
    });

    it('404 when the sequence does not exist', async () => {
      sequenceRepo.getDanceSequence.mockResolvedValue(null);
      const res = await request(app).get('/dance-sequences/99');
      expect(res.status).toBe(404);
    });

    it('200 with the sequence body', async () => {
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 5, name: 'Routine' });
      const res = await request(app).get('/dance-sequences/5');
      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual({ id: 5, name: 'Routine' });
    });
  });

  describe('POST /dance-sequences', () => {
    it('401 without authentication', async () => {
      const res = await request(app).post('/dance-sequences').send({ name: 'x' });
      expect(res.status).toBe(401);
    });

    it('400 when the body is empty', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .post('/dance-sequences')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });

    it('400 when the body contains an id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .post('/dance-sequences')
        .set('Cookie', [`accessToken=${token}`])
        .send({ id: 5, name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when required fields are missing (service rejects)', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      // service throws because `name` is missing
      const res = await request(app)
        .post('/dance-sequences')
        .set('Cookie', [`accessToken=${token}`])
        .send({ description: 'no name' });
      expect(res.status).toBe(400);
    });

    it('201 with valid body', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.createDanceSequence.mockImplementation(async (data: any) => ({ ...data, id: 1 }));

      const res = await request(app)
        .post('/dance-sequences')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'New routine' });

      expect(res.status).toBe(201);
      const payload = sequenceRepo.createDanceSequence.mock.calls[0][0];
      expect(payload.user_id).toBe(10);
      expect(payload.name).toBe('New routine');
    });
  });

  describe('PUT /dance-sequences/:id', () => {
    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/dance-sequences/-1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when body is empty', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });

    it('404 when sequence does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue(null);

      const res = await request(app)
        .put('/dance-sequences/9')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'updated' });

      expect(res.status).toBe(404);
    });

    it('403 when a non-owner non-admin tries to update', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 99 });

      const res = await request(app)
        .put('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'hijack' });

      expect(res.status).toBe(403);
    });

    it('200 when the owner updates their sequence', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 10 });
      sequenceRepo.updateDanceSequence.mockResolvedValue({ id: 1, name: 'updated', user_id: 10 });

      const res = await request(app)
        .put('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'updated' });

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text).name).toBe('updated');
    });

    it('200 when an admin updates anyone\'s sequence', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 99 });
      sequenceRepo.updateDanceSequence.mockResolvedValue({ id: 1, name: 'admin edit' });

      const res = await request(app)
        .put('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'admin edit' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /dance-sequences/:id', () => {
    it('401 without authentication', async () => {
      const res = await request(app).delete('/dance-sequences/1');
      expect(res.status).toBe(401);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .delete('/dance-sequences/0')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('404 when sequence missing', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue(null);

      const res = await request(app)
        .delete('/dance-sequences/9')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('403 when non-owner non-admin tries to delete', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 99 });

      const res = await request(app)
        .delete('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(403);
      expect(sequenceRepo.deleteDanceSequence).not.toHaveBeenCalled();
    });

    it('204 when owner deletes their sequence', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      sequenceRepo.getDanceSequence.mockResolvedValue({ id: 1, user_id: 10 });
      sequenceRepo.deleteDanceSequence.mockResolvedValue(true);

      const res = await request(app)
        .delete('/dance-sequences/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(sequenceRepo.deleteDanceSequence).toHaveBeenCalledWith('1');
    });
  });
});
