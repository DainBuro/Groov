import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppUser, RefreshToken, RoleType } from '../../src/schema';
import { buildTestApp, rebindRepositories } from './helpers/testApp';

// Tiny in-memory fake of AuthRepository — exposes only what the tests need.
const createInMemoryAuthRepo = () => {
  const users: AppUser[] = [];
  const refreshTokens: RefreshToken[] = [];
  let nextUserId = 1;
  let nextTokenId = 1;

  return {
    _users: users,
    _refreshTokens: refreshTokens,
    async getUserByUsername(username?: string) {
      return users.find((u) => u.username === username);
    },
    async getUserById(id: number) {
      return users.find((u) => u.id === id);
    },
    async addUser(user: Omit<AppUser, 'id'>) {
      const created: AppUser = { ...user, id: nextUserId++ };
      users.push(created);
      return [created];
    },
    async addRefreshToken(token: Omit<RefreshToken, 'id'>) {
      const created: RefreshToken = { ...token, id: nextTokenId++ };
      refreshTokens.push(created);
      return [created];
    },
    async getRefreshTokenUserId(token: string) {
      return refreshTokens.filter((t) => t.token === token).map(({ user_id }) => ({ user_id }));
    },
    async deleteRefreshToken(token: string) {
      const idx = refreshTokens.findIndex((t) => t.token === token);
      if (idx >= 0) refreshTokens.splice(idx, 1);
      return 1;
    }
  };
};

describe('Auth routes (integration)', () => {
  let app: ReturnType<typeof buildTestApp>;
  let repo: ReturnType<typeof createInMemoryAuthRepo>;

  beforeAll(() => {
    repo = createInMemoryAuthRepo();
    rebindRepositories({ authRepository: repo as any });
    app = buildTestApp();
  });

  describe('POST /auth/signup', () => {
    it('creates a new user and stores a hashed password', async () => {
      const res = await request(app).post('/auth/signup').send({ username: 'dainius', password: 'pw12345' });

      expect(res.status).toBe(200);
      expect(repo._users).toHaveLength(1);
      const stored = repo._users[0];
      expect(stored.username).toBe('dainius');
      expect(stored.password).not.toBe('pw12345');
      expect(await bcrypt.compare('pw12345', stored.password)).toBe(true);
    });

    it('responds 409 when the username is already taken', async () => {
      const res = await request(app).post('/auth/signup').send({ username: 'dainius', password: 'other' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('sets accessToken and refreshToken cookies on success', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'dainius', password: 'pw12345' });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('responds 400 with a wrong password', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'dainius', password: 'bad' });
      expect(res.status).toBe(400);
    });

    it('responds 400 for a missing user', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'ghost', password: 'x' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 when no cookie is sent', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the authenticated user (without password)', async () => {
      const login = await request(app).post('/auth/login').send({ username: 'dainius', password: 'pw12345' });
      const cookies = login.headers['set-cookie'] as unknown as string[];

      const res = await request(app).get('/auth/me').set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('dainius');
      expect(res.body.role).toBe(RoleType.User);
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('POST /auth/logout', () => {
    it('removes the refresh token and clears cookies', async () => {
      const login = await request(app).post('/auth/login').send({ username: 'dainius', password: 'pw12345' });
      const cookies = login.headers['set-cookie'] as unknown as string[];
      const tokensBefore = repo._refreshTokens.length;

      const res = await request(app).post('/auth/logout').set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(repo._refreshTokens.length).toBe(tokensBefore - 1);
    });
  });
});
