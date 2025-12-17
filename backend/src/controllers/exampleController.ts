import { controller, httpPost, requestBody, BaseHttpController, httpGet } from 'inversify-express-utils';
import { inject } from 'inversify';
import { iocContainer } from '../ioc/inversify.config';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import _ from 'lodash';
import { RoleType } from '../schema';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/example')
export class ExampleController extends BaseHttpController {
  constructor(@inject(TYPES.authService) private authService: AuthService) {
    super();
  }

  @httpGet('/auth', authService.authenticate([RoleType.User]))
  private async auth() {
    const user = this.httpContext.user.details;

    return this.ok(`Hello world, ${user.role} ${user.id}`);
  }

  @httpGet('/no-auth')
  private async noAuth() {
    return this.ok('Hello world');
  }
}
