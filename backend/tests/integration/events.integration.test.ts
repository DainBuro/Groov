import request from 'supertest';
import jwt from 'jsonwebtoken';
import { RoleType } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

const signAccessToken = (payload: { id: number; role: RoleType }) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });

describe('Event routes (integration)', () => {
  const eventRepo = {
    getAllEvents: jest.fn(),
    getEventById: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  };

  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    rebindRepositories({ eventRepository: eventRepo as any });
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /events', () => {
    it('returns the list of events', async () => {
      eventRepo.getAllEvents.mockResolvedValue([{ id: 1, name: 'Jam' }]);

      const res = await request(app).get('/events');

      expect(res.status).toBe(200);
      // Controller responds with text/plain so parse the raw body.
      expect(JSON.parse(res.text)).toEqual([{ id: 1, name: 'Jam' }]);
      expect(eventRepo.getAllEvents).toHaveBeenCalledWith(undefined);
    });

    it('forwards the search query', async () => {
      eventRepo.getAllEvents.mockResolvedValue([]);
      await request(app).get('/events?search=camp').expect(200);
      expect(eventRepo.getAllEvents).toHaveBeenCalledWith('camp');
    });
  });

  describe('POST /events', () => {
    it('401 when no access token cookie is sent', async () => {
      const res = await request(app).post('/events').send({ name: 'x' });
      expect(res.status).toBe(401);
      expect(eventRepo.createEvent).not.toHaveBeenCalled();
    });

    it('403 for non-admin users', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.User });
      const res = await request(app)
        .post('/events')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });

      expect(res.status).toBe(403);
    });

    it('201 for admin with a valid body', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      eventRepo.createEvent.mockResolvedValue([{ id: 5, name: 'New Event' }]);

      const res = await request(app)
        .post('/events')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'New Event' });

      expect(res.status).toBe(201);
      expect(eventRepo.createEvent).toHaveBeenCalledWith({ name: 'New Event' });
    });

    it('400 when the body is empty', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });

      const res = await request(app)
        .post('/events')
        .set('Cookie', [`accessToken=${token}`])
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /events/:id', () => {
    it('404 when the event does not exist', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      eventRepo.getEventById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/events/99')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(404);
    });

    it('204 for admin with an existing event', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      eventRepo.getEventById.mockResolvedValue({ id: 1, name: 'Jam' });
      eventRepo.deleteEvent.mockResolvedValue(1);

      const res = await request(app)
        .delete('/events/1')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(eventRepo.deleteEvent).toHaveBeenCalledWith('1');
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      const res = await request(app)
        .delete('/events/-1')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it('401 without authentication', async () => {
      const res = await request(app).delete('/events/1');
      expect(res.status).toBe(401);
    });

    it('403 for non-admin users', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.User });
      const res = await request(app)
        .delete('/events/1')
        .set('Cookie', [`accessToken=${token}`]);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /events/:id', () => {
    it('400 for non-positive id', async () => {
      const res = await request(app).get('/events/-1');
      expect(res.status).toBe(400);
    });

    it('404 when not found', async () => {
      eventRepo.getEventById.mockResolvedValue(null);
      const res = await request(app).get('/events/9');
      expect(res.status).toBe(404);
    });

    it('200 with the event', async () => {
      eventRepo.getEventById.mockResolvedValue({ id: 3, name: 'Camp' });
      const res = await request(app).get('/events/3');
      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual({ id: 3, name: 'Camp' });
    });
  });

  describe('POST /events validation', () => {
    it('400 when the body contains an id', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      const res = await request(app)
        .post('/events')
        .set('Cookie', [`accessToken=${token}`])
        .send({ id: 5, name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when the service rejects the payload', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      // Missing `name` triggers the service-level error → controller maps to 400.
      const res = await request(app)
        .post('/events')
        .set('Cookie', [`accessToken=${token}`])
        .send({ description: 'no name' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /events/:id', () => {
    it('401 without authentication', async () => {
      const res = await request(app).put('/events/1').send({ name: 'x' });
      expect(res.status).toBe(401);
    });

    it('403 for non-admin users', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.User });
      const res = await request(app)
        .put('/events/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });
      expect(res.status).toBe(403);
    });

    it('400 for non-positive id', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      const res = await request(app)
        .put('/events/-1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when the body contains an id', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      const res = await request(app)
        .put('/events/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ id: 9, name: 'x' });
      expect(res.status).toBe(400);
    });

    it('400 when the body is empty', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      const res = await request(app)
        .put('/events/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });

    it('404 when the event does not exist', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      eventRepo.getEventById.mockResolvedValue(null);

      const res = await request(app)
        .put('/events/9')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'x' });

      expect(res.status).toBe(404);
    });

    it('200 with the updated event', async () => {
      const token = signAccessToken({ id: 1, role: RoleType.Admin });
      eventRepo.getEventById.mockResolvedValue({ id: 1, name: 'Old' });
      eventRepo.updateEvent.mockResolvedValue([{ id: 1, name: 'New' }]);

      const res = await request(app)
        .put('/events/1')
        .set('Cookie', [`accessToken=${token}`])
        .send({ name: 'New' });

      expect(res.status).toBe(200);
      expect(JSON.parse(res.text)).toEqual({ id: 1, name: 'New' });
    });
  });
});
