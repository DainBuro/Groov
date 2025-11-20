import { controller, httpPost, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject } from 'inversify';
import { iocContainer } from '../ioc/inversify.config';
import { Cookie, Signup, Login } from '../types/authTypes';
import { TYPES } from '../ioc/types';
import { AuthService, REFRESH_TOKEN_EXPIRATION } from '../services/authService';
import Conflict from '../errors/Conflict';
import _ from 'lodash';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/auth')
export class AuthController extends BaseHttpController {
  constructor(@inject(TYPES.authService) private authService: AuthService) {
    super();
  }

  @httpPost('/signup')
  private async signup(@requestBody() body: Signup) {
    try {
      await this.authService.signup(body);
    } catch (err) {
      if (err instanceof Conflict) {
        console.error(err.message);
        return this.conflict();
      }
    }

    return this.ok();
  }

  @httpPost('/login')
  private async login(@requestBody() body: Login) {
    let accessToken: string;
    let refreshToken: string;
    try {
      [accessToken, refreshToken] = await this.authService.login(body);
    } catch (err) {
      console.log(err.message);
      return this.badRequest(err.message);
    }

    this.httpContext.response.cookie(Cookie.ACCESS_TOKEN, accessToken, {
      maxAge: REFRESH_TOKEN_EXPIRATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'strict'
    });

    this.httpContext.response.cookie(Cookie.REFRESH_TOKEN, refreshToken, {
      maxAge: REFRESH_TOKEN_EXPIRATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return this.ok();
  }

  @httpPost('/logout')
  private async logout() {
    this.httpContext.response.clearCookie(Cookie.ACCESS_TOKEN, { httpOnly: true, secure: true, sameSite: 'strict' });
    this.httpContext.response.clearCookie(Cookie.REFRESH_TOKEN, { httpOnly: true, secure: true, sameSite: 'strict' });

    const refreshToken = this.httpContext.request.cookies[Cookie.REFRESH_TOKEN];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    return this.ok();
  }

  @httpPost('/refresh')
  private async refresh() {
    const refreshToken = this.httpContext.request.cookies[Cookie.REFRESH_TOKEN];

    if (refreshToken == null) {
      return this.badRequest('Refresh token is required');
    }

    try {
      const newAccessToken: string = await this.authService.refresh(refreshToken);

      this.httpContext.response.cookie(Cookie.ACCESS_TOKEN, newAccessToken, {
        maxAge: REFRESH_TOKEN_EXPIRATION,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return this.json({ newAccessToken }, 200);
    } catch (err) {
      return this.httpContext.response.sendStatus(401);
    }
  }
}
