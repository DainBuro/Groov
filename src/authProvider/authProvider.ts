import * as express from 'express';
import { injectable, inject } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import { Principal } from './principal';
import cookie from 'cookie';

const authService = inject(TYPES.authService);

@injectable()
export class AuthProvider implements interfaces.AuthProvider {
  @authService private readonly authService: AuthService;

  constructor() {}

  public async getUser(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<interfaces.Principal> {
    const cookies = cookie.parse(req.headers.cookie || '');
    const accessToken = cookies?.['accessToken'];
    const user = await this.authService.getUser(accessToken);

    const principal = new Principal(user);
    return principal;
  }
}
