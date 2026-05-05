import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthService } from '../../../src/services/authService';
import { AuthRepository } from '../../../src/repositories/authRepository';
import { RoleType } from '../../../src/schema';
import Conflict from '../../../src/errors/Conflict';
import InvalidCredentials from '../../../src/errors/InvalidCredentials';

const makeRepoMock = (): jest.Mocked<Partial<AuthRepository>> => ({
  getUserByUsername: jest.fn(),
  addUser: jest.fn(),
  addRefreshToken: jest.fn(),
  getRefreshTokenUserId: jest.fn(),
  deleteRefreshToken: jest.fn(),
  getUserById: jest.fn()
});

describe('AuthService', () => {
  let repo: jest.Mocked<Partial<AuthRepository>>;
  let service: AuthService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new AuthService(repo as unknown as AuthRepository);
  });

  describe('signup', () => {
    it('creates a user when the username is free', async () => {
      repo.getUserByUsername!.mockResolvedValue(undefined as any);
      repo.addUser!.mockResolvedValue([] as any);

      await service.signup({ username: 'dainius', password: 'pw' });

      expect(repo.getUserByUsername).toHaveBeenCalledWith('dainius');
      expect(repo.addUser).toHaveBeenCalledTimes(1);
      const savedUser = (repo.addUser as jest.Mock).mock.calls[0][0];
      expect(savedUser.username).toBe('dainius');
      expect(savedUser.role).toBe(RoleType.User);
      expect(savedUser.password).not.toBe('pw');
      // Should be bcrypt-hashed and verifiable.
      expect(await bcrypt.compare('pw', savedUser.password)).toBe(true);
    });

    it('throws Conflict when the username is taken', async () => {
      repo.getUserByUsername!.mockResolvedValue({ id: 1, username: 'dainius' } as any);

      await expect(service.signup({ username: 'dainius', password: 'pw' })).rejects.toBeInstanceOf(Conflict);
      expect(repo.addUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens on success', async () => {
      const hashed = await bcrypt.hash('secret', 10);
      repo.getUserByUsername!.mockResolvedValue({
        id: 10,
        username: 'dainius',
        password: hashed,
        role: RoleType.User
      } as any);
      repo.addRefreshToken!.mockResolvedValue([] as any);

      const [accessToken, refreshToken] = await service.login({ username: 'dainius', password: 'secret' });

      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as any;
      expect(decoded.id).toBe(10);
      expect(decoded.role).toBe(RoleType.User);
      expect(repo.addRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('throws InvalidCredentials when password does not match', async () => {
      const hashed = await bcrypt.hash('other', 10);
      repo.getUserByUsername!.mockResolvedValue({
        id: 1,
        username: 'dainius',
        password: hashed,
        role: RoleType.User
      } as any);

      await expect(service.login({ username: 'dainius', password: 'wrong' })).rejects.toBeInstanceOf(
        InvalidCredentials
      );
      expect(repo.addRefreshToken).not.toHaveBeenCalled();
    });

    it('throws InvalidCredentials when the user does not exist', async () => {
      repo.getUserByUsername!.mockResolvedValue(undefined as any);

      await expect(service.login({ username: 'ghost', password: 'x' })).rejects.toBeInstanceOf(InvalidCredentials);
    });

    it('throws Conflict when username is missing', async () => {
      await expect(service.login({ username: '', password: 'x' } as any)).rejects.toBeInstanceOf(Conflict);
    });
  });

  describe('isTokenValid', () => {
    it('returns true for a valid token', async () => {
      const token = jwt.sign({ id: 1, role: RoleType.User }, process.env.ACCESS_TOKEN_SECRET!);
      expect(await service.isTokenValid(token, process.env.ACCESS_TOKEN_SECRET!)).toBe(true);
    });

    it('returns false for a bad token', async () => {
      expect(await service.isTokenValid('garbage', process.env.ACCESS_TOKEN_SECRET!)).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns null when no token is provided', async () => {
      expect(await service.getCurrentUser()).toBeNull();
    });

    it('returns the user (without password) for a valid token', async () => {
      const token = jwt.sign({ id: 5, role: RoleType.User }, process.env.ACCESS_TOKEN_SECRET!);
      repo.getUserById!.mockResolvedValue({ id: 5, username: 'dainius', password: 'hash', role: RoleType.User } as any);

      const user = await service.getCurrentUser(token);

      expect(user).toEqual({ id: 5, username: 'dainius', role: RoleType.User });
      expect(user).not.toHaveProperty('password');
    });

    it('returns null when the token is invalid', async () => {
      expect(await service.getCurrentUser('bad-token')).toBeNull();
    });
  });

  describe('authenticate middleware', () => {
    const runMiddleware = (middleware: any, req: any) =>
      new Promise<{ status?: number; body?: any; nextCalled: boolean }>((resolve) => {
        let status: number | undefined;
        let body: any;
        let nextCalled = false;
        const res: any = {
          status(code: number) {
            status = code;
            return res;
          },
          send(payload: any) {
            body = payload;
            resolve({ status, body, nextCalled });
            return res;
          },
          sendStatus(code: number) {
            status = code;
            resolve({ status, nextCalled });
            return res;
          }
        };
        middleware(req, res, () => {
          nextCalled = true;
          resolve({ status, body, nextCalled });
        });
      });

    it('responds 401 when access token is missing', async () => {
      const result = await runMiddleware(service.authenticate(), { cookies: {} });
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ missingToken: true });
      expect(result.nextCalled).toBe(false);
    });

    it('responds 401 when token is invalid/expired', async () => {
      const result = await runMiddleware(service.authenticate(), { cookies: { accessToken: 'garbage' } });
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ expiredToken: true });
    });

    it('calls next when token is valid and no role restriction', async () => {
      const token = jwt.sign({ id: 1, role: RoleType.User }, process.env.ACCESS_TOKEN_SECRET!);
      const result = await runMiddleware(service.authenticate(), { cookies: { accessToken: token } });
      expect(result.nextCalled).toBe(true);
    });

    it('responds 403 when role does not match', async () => {
      const token = jwt.sign({ id: 1, role: RoleType.User }, process.env.ACCESS_TOKEN_SECRET!);
      const result = await runMiddleware(service.authenticate([RoleType.Admin]), { cookies: { accessToken: token } });
      expect(result.status).toBe(403);
      expect(result.nextCalled).toBe(false);
    });

    it('calls next when required role matches', async () => {
      const token = jwt.sign({ id: 1, role: RoleType.Admin }, process.env.ACCESS_TOKEN_SECRET!);
      const result = await runMiddleware(service.authenticate([RoleType.Admin]), { cookies: { accessToken: token } });
      expect(result.nextCalled).toBe(true);
    });
  });
});
