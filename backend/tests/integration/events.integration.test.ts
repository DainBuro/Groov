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
});
