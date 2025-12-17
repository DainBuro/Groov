import _ from 'lodash';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { inject, injectable } from 'inversify';
import { Cookie, Login, Signup, TokenInfo } from '../types/authTypes';
import { NextFunction, Request, Response } from 'express';
import { TYPES } from '../ioc/types';
import Conflict from '../errors/Conflict';
import InvalidCredentials from '../errors/InvalidCredentials';
import { AppUser, RefreshToken, RoleType } from '../schema';
import { AuthRepository } from '../repositories/authRepository';

const SALT_ROUNDS = 10;

type CustomResponse = { body: any; statusCode: number };

// 6 hours
export const REFRESH_TOKEN_EXPIRATION = 1000 * 60 * 60 * 6;

// 30 minutes
export const ACCESS_TOKEN_EXPIRATION = 1000 * 60 * 30;

export const sendResponse = (expressResponse: Response, customResponse: CustomResponse) => {
  return expressResponse.status(customResponse.statusCode).send(customResponse.body);
};

export const EXPIRED_TOKEN_RESPONSE: CustomResponse = { body: { expiredToken: true }, statusCode: 401 };
export const MISSING_TOKEN_RESPONSE: CustomResponse = { body: { missingToken: true }, statusCode: 401 };

@injectable()
export class AuthService {
  constructor(@inject(TYPES.authRepository) private authRepository: AuthRepository) {}

  async signup(data: Signup): Promise<void> {
    const usernameUser = await this.authRepository.getUserByUsername(data.username);

    if (!_.isEmpty(usernameUser)) {
      throw new Conflict('Prisijungimo vardas jau egzistuoja', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const newUser: Omit<AppUser, 'id'> = {
      username: data.username,
      password: hashedPassword,
      role: RoleType.User,
      deleted: false
    };

    await this.authRepository.addUser(newUser);
  }

  async login(data: Login): Promise<[string, string]> {
    if (!data.username) {
      throw new Conflict('Missing username', 409);
    }

    const user = await this.authRepository.getUserByUsername(data.username);

    if (_.isEmpty(user)) {
      throw new InvalidCredentials('No sure with such username', 400);
    }

    const match = await bcrypt.compare(data.password, user.password);

    if (!match) {
      throw new InvalidCredentials('Incorrect password', 400);
    }

    const token = { id: user.id, role: user.role };

    const accessToken = await this.generateToken(token, ACCESS_TOKEN_EXPIRATION, process.env.ACCESS_TOKEN_SECRET);
    const refreshToken = await this.generateToken(token, REFRESH_TOKEN_EXPIRATION, process.env.REFRESH_TOKEN_SECRET);

    const refreshTokenEntry: Omit<RefreshToken, 'id'> = {
      token: refreshToken,
      user_id: token.id,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION),
      created_at: new Date()
    };

    await this.authRepository.addRefreshToken(refreshTokenEntry);

    return [accessToken, refreshToken];
  }

  async logout(refreshToken: string) {
    return this.authRepository.deleteRefreshToken(refreshToken);
  }

  async refresh(refreshToken: string) {
    const token = await this.authRepository.getRefreshTokenUserId(refreshToken);

    if (_.isEmpty(token)) {
      throw new Conflict('Refresh token does not exist', 409);
    }

    const newAccessToken: string = await new Promise((resolve, reject) => {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, user: TokenInfo) => {
        if (err) {
          reject(err);
          return;
        }

        const newToken: TokenInfo = {
          id: user.id,
          role: user.role
        };

        const token = await this.generateToken(newToken, ACCESS_TOKEN_EXPIRATION, process.env.ACCESS_TOKEN_SECRET);

        resolve(token);
      });
    });

    return newAccessToken;
  }

  async generateToken(data: any, expiresIn: number, secret: string) {
    return jwt.sign(data, secret, { expiresIn: `${expiresIn}ms` });
  }

  async isTokenValid(token: string, secret: string) {
    try {
      jwt.verify(token, secret);
      return true;
    } catch (err) {
      return false;
    }
  }

  authenticate(roles?: RoleType[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const accessToken = req.cookies?.[Cookie.ACCESS_TOKEN];
      if (!accessToken) {
        return sendResponse(res, MISSING_TOKEN_RESPONSE);
      }

      let decodedToken: TokenInfo;

      try {
        decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET) as TokenInfo;
      } catch (err) {
        return sendResponse(res, EXPIRED_TOKEN_RESPONSE);
      }

      if (_.isEmpty(roles)) {
        return next();
      }

      if (!roles.includes(decodedToken.role)) {
        return res.sendStatus(403);
      }

      return next();
    };
  }

  async getUser(token?: string) {
    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as TokenInfo;
      return decodedToken;
    } catch (err) {
      return null;
    }
  }

  async getCurrentUser(token?: string): Promise<Omit<AppUser, 'password'> | null> {
    if (!token) {
      return null;
    }

    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as TokenInfo;
      const user = await this.authRepository.getUserById(decodedToken.id);

      if (!user) {
        return null;
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      return null;
    }
  }
}
