import request from 'supertest';
import jwt from 'jsonwebtoken';
import { DifficultyEnum, KeyPositionEnum, RoleType, SubmissionStatusEnum } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

const signAccessToken = (payload: { id: number; role: RoleType }) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });

describe('Dance move routes (integration)', () => {
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
    rebindRepositories({ danceMoveRepository: moveRepo as any });
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dance-moves', () => {
    it('returns a list of moves', async () => {
      moveRepo.getAllDanceMoves.mockResolvedValue([{ id: 1, name: 'Swingout' }]);

      const res = await request(app).get('/dance-moves');

      expect(res.status).toBe(200);
      const body = JSON.parse(res.text);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('Swingout');
    });
  });

  describe('GET /dance-moves/:id', () => {
    it('returns 404 when the move does not exist', async () => {
      moveRepo.getDanceMove.mockResolvedValue(null);
      const res = await request(app).get('/dance-moves/999');
      expect(res.status).toBe(404);
    });

    it('returns the move when approved', async () => {
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, submission_status: SubmissionStatusEnum.Approved });
      const res = await request(app).get('/dance-moves/1');
      expect(res.status).toBe(200);
      expect(JSON.parse(res.text).id).toBe(1);
    });

    it('hides pending submissions from anonymous users', async () => {
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, submission_status: SubmissionStatusEnum.Pending, created_by: 2,
      });
      const res = await request(app).get('/dance-moves/1');
      expect(res.status).toBe(404);
    });

    it('400 for non-positive ids', async () => {
      const res = await request(app).get('/dance-moves/-1');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /dance-moves', () => {
    const validBody = {
      name: 'Swingout',
      difficulty: DifficultyEnum.Easy,
      start_position: KeyPositionEnum.Closed,
      end_position: KeyPositionEnum.OpenLeftToRight,
    };

    it('401 without authentication', async () => {
      const res = await request(app).post('/dance-moves').send(validBody);
      expect(res.status).toBe(401);
    });

    it('201 with pending status for a regular user', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.createDanceMove.mockImplementation(async (data: any) => ({ ...data, id: 1 }));

      const res = await request(app)
        .post('/dance-moves')
        .set('Cookie', [`accessToken=${token}`])
        .send(validBody);

      expect(res.status).toBe(201);
      expect(moveRepo.createDanceMove).toHaveBeenCalledTimes(1);
      const payload = moveRepo.createDanceMove.mock.calls[0][0];
      expect(payload.submission_status).toBe(SubmissionStatusEnum.Pending);
      expect(payload.created_by).toBe(10);
    });

    it('201 with approved status for an admin', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.createDanceMove.mockImplementation(async (data: any) => ({ ...data, id: 1 }));

      const res = await request(app)
        .post('/dance-moves')
        .set('Cookie', [`accessToken=${token}`])
        .send(validBody);

      expect(res.status).toBe(201);
      const payload = moveRepo.createDanceMove.mock.calls[0][0];
      expect(payload.submission_status).toBe(SubmissionStatusEnum.Approved);
    });

    it('400 with an empty body', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .post('/dance-moves')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /dance-moves/pending', () => {
    it('403 when a non-admin tries to list pending submissions', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .get('/dance-moves/pending')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });

    it('200 for an admin', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getAllDanceMoves.mockResolvedValue([]);

      const res = await request(app)
        .get('/dance-moves/pending')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(moveRepo.getAllDanceMoves).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: [SubmissionStatusEnum.Pending] })
      );
    });
  });

  describe('DELETE /dance-moves/:id', () => {
    it('401 without authentication', async () => {
      const res = await request(app).delete('/dance-moves/1');
      expect(res.status).toBe(401);
    });

    it('204 when a user deletes their own pending move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, created_by: 10, submission_status: SubmissionStatusEnum.Pending });
      moveRepo.deleteDanceMove.mockResolvedValue(1);

      const res = await request(app)
        .delete('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    it('403 when a non-admin tries to delete someone else\'s move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, created_by: 99, submission_status: SubmissionStatusEnum.Pending });

      const res = await request(app)
        .delete('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(403);
      expect(moveRepo.deleteDanceMove).not.toHaveBeenCalled();
    });
  });

  describe('POST /dance-moves/:id/approve', () => {
    it('admin approves a pending move', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, submission_status: SubmissionStatusEnum.Pending });
      moveRepo.updateSubmissionStatus.mockResolvedValue({ id: 1, submission_status: SubmissionStatusEnum.Approved });

      const res = await request(app)
        .post('/dance-moves/1/approve')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      // The id arrives as a string from the URL parameter.
      expect(moveRepo.updateSubmissionStatus).toHaveBeenCalledWith('1', SubmissionStatusEnum.Approved, null);
    });

    it('non-admin is forbidden', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.User });
      const res = await request(app)
        .post('/dance-moves/1/approve')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });
  });
});
