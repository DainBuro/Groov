import request from 'supertest';
import jwt from 'jsonwebtoken';
import { DifficultyEnum, KeyPositionEnum, PoseStatusEnum, RoleType, SubmissionStatusEnum } from '../../src/schema';
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

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .post('/dance-moves/9/approve')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .post('/dance-moves/-1/approve')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /dance-moves/:id/reject', () => {
    it('non-admin is forbidden', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.User });
      const res = await request(app)
        .post('/dance-moves/1/reject')
        .set('Cookie', [`accessToken=${token}`])
        .send({ reason: 'no' });
      expect(res.status).toBe(403);
    });

    it('rejects with a reason', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, submission_status: SubmissionStatusEnum.Pending });
      moveRepo.updateSubmissionStatus.mockResolvedValue({
        id: 1, submission_status: SubmissionStatusEnum.Rejected, rejection_reason: 'too similar',
      });

      const res = await request(app)
        .post('/dance-moves/1/reject')
        .set('Cookie', [`accessToken=${token}`])
        .send({ reason: 'too similar' });

      expect(res.status).toBe(200);
      expect(moveRepo.updateSubmissionStatus).toHaveBeenCalledWith('1', SubmissionStatusEnum.Rejected, 'too similar');
    });

    it('rejects with null reason when empty/whitespace', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1 });
      moveRepo.updateSubmissionStatus.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .post('/dance-moves/1/reject')
        .set('Cookie', [`accessToken=${token}`])
        .send({ reason: '   ' });

      expect(res.status).toBe(200);
      expect(moveRepo.updateSubmissionStatus).toHaveBeenCalledWith('1', SubmissionStatusEnum.Rejected, null);
    });

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .post('/dance-moves/9/reject')
        .set('Cookie', [`accessToken=${token}`])
        .send({ reason: 'gone' });

      expect(res.status).toBe(404);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .post('/dance-moves/0/reject')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /dance-moves/:id', () => {
    it('401 without authentication', async () => {
      const res = await request(app).put('/dance-moves/1').send({ name: 'x' });
      expect(res.status).toBe(401);
    });

    it('400 when id is non-positive', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/dance-moves/-1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when body contains an id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .put('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ id: 9, name: 'x' });
      expect(res.status).toBe(400);
    });

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .put('/dance-moves/9')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });

      expect(res.status).toBe(404);
    });

    it('403 when non-owner non-admin tries to edit', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 99, submission_status: SubmissionStatusEnum.Pending,
      });

      const res = await request(app)
        .put('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'hijack' });

      expect(res.status).toBe(403);
    });

    it('403 when owner edits an already-approved move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 10, submission_status: SubmissionStatusEnum.Approved,
      });

      const res = await request(app)
        .put('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'late edit' });

      expect(res.status).toBe(403);
    });

    it('200 when owner edits a pending move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 10, submission_status: SubmissionStatusEnum.Pending,
      });
      moveRepo.updateDanceMove.mockImplementation(async (data: any) => data);

      const res = await request(app)
        .put('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'updated' });

      expect(res.status).toBe(200);
    });

    it('flips status to pending when owner re-edits a rejected move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 10, submission_status: SubmissionStatusEnum.Rejected,
      });
      moveRepo.updateDanceMove.mockImplementation(async (data: any) => data);

      const res = await request(app)
        .put('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'reworked' });

      expect(res.status).toBe(200);
      const payload = moveRepo.updateDanceMove.mock.calls[0][0];
      expect(payload.submission_status).toBe(SubmissionStatusEnum.Pending);
      expect(payload.rejection_reason).toBeNull();
    });
  });

  describe('DELETE /dance-moves/:id', () => {
    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .delete('/dance-moves/0')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .delete('/dance-moves/99')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('403 when owner tries to delete an already-approved move', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 10, submission_status: SubmissionStatusEnum.Approved,
      });

      const res = await request(app)
        .delete('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(403);
    });

    it('204 when admin deletes any move', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue({
        id: 1, created_by: 99, submission_status: SubmissionStatusEnum.Approved,
      });
      moveRepo.deleteDanceMove.mockResolvedValue(1);

      const res = await request(app)
        .delete('/dance-moves/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
    });
  });

  describe('GET /dance-moves/difficulty/:difficulty', () => {
    it('400 for an invalid difficulty', async () => {
      const res = await request(app).get('/dance-moves/difficulty/impossible');
      expect(res.status).toBe(400);
    });

    it('200 with the moves for a valid difficulty', async () => {
      moveRepo.getDanceMovesByDifficulty.mockResolvedValue([{ id: 1 }]);
      const res = await request(app).get('/dance-moves/difficulty/easy');
      expect(res.status).toBe(200);
      expect(moveRepo.getDanceMovesByDifficulty).toHaveBeenCalledWith(DifficultyEnum.Easy, true);
    });
  });

  describe('GET /dance-moves/my', () => {
    it('401 without authentication', async () => {
      const res = await request(app).get('/dance-moves/my');
      expect(res.status).toBe(401);
    });

    it('forwards the requester id as creatorId', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      moveRepo.getAllDanceMoves.mockResolvedValue([]);

      const res = await request(app)
        .get('/dance-moves/my?search=swing')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(moveRepo.getAllDanceMoves).toHaveBeenCalledWith(
        expect.objectContaining({ creatorId: 10, search: 'swing' })
      );
    });
  });

  describe('GET /dance-moves/:id/children', () => {
    it('400 for non-positive id', async () => {
      const res = await request(app).get('/dance-moves/-1/children');
      expect(res.status).toBe(400);
    });

    it('404 when the parent move is missing', async () => {
      moveRepo.getDanceMove.mockResolvedValue(null);
      const res = await request(app).get('/dance-moves/9/children');
      expect(res.status).toBe(404);
    });

    it('200 with child moves', async () => {
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, submission_status: SubmissionStatusEnum.Approved });
      moveRepo.getChildMoves.mockResolvedValue([{ id: 2 }, { id: 3 }]);

      const res = await request(app).get('/dance-moves/1/children');

      expect(res.status).toBe(200);
      expect(moveRepo.getChildMoves).toHaveBeenCalledWith('1', true);
    });
  });

  describe('GET /dance-moves/:id/parent', () => {
    it('400 for non-positive id', async () => {
      const res = await request(app).get('/dance-moves/0/parent');
      expect(res.status).toBe(400);
    });

    it('404 when the child move is missing', async () => {
      moveRepo.getDanceMove.mockResolvedValue(null);
      const res = await request(app).get('/dance-moves/9/parent');
      expect(res.status).toBe(404);
    });

    it('200 with the parent move', async () => {
      moveRepo.getDanceMove.mockResolvedValue({ id: 2, submission_status: SubmissionStatusEnum.Approved });
      moveRepo.getParentMove.mockResolvedValue({ id: 1 });

      const res = await request(app).get('/dance-moves/2/parent');

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual({ id: 1 });
    });
  });

  describe('POST /dance-moves/:id/pose', () => {
    it('403 for non-admin users', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .post('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });

    it('400 when no file is uploaded', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .post('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/No file uploaded/i);
    });

    it('400 for an unsupported video extension', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .post('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`])
        .attach('video', Buffer.from('not a video'), 'clip.txt');
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Invalid file type/i);
    });

    it('400 when numPoses is out of range', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .post('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`])
        .field('numPoses', '9')
        .attach('video', Buffer.from('fake video'), 'clip.mp4');
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/numPoses/);
    });
  });

  describe('DELETE /dance-moves/:id/pose', () => {
    it('403 for non-admin users', async () => {
      const token = signAccessToken({ id: 10, role: RoleType.User });
      const res = await request(app)
        .delete('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      const res = await request(app)
        .delete('/dance-moves/0/pose')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('404 when the move does not exist', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue(null);

      const res = await request(app)
        .delete('/dance-moves/9/pose')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('204 when the pose data is cleared', async () => {
      const token = signAccessToken({ id: 2, role: RoleType.Admin });
      moveRepo.getDanceMove.mockResolvedValue({ id: 1, pose_status: PoseStatusEnum.Ready });
      moveRepo.updatePoseData.mockResolvedValue({ id: 1, pose_data: null });

      const res = await request(app)
        .delete('/dance-moves/1/pose')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(moveRepo.updatePoseData).toHaveBeenCalledWith('1', null, null);
    });
  });
});
