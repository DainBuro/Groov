import {
  controller,
  httpGet,
  httpPost,
  httpDelete,
  requestParam,
  BaseHttpController
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import { FavoriteMoveService } from '../services/favoriteMoveService';
import { iocContainer } from '../ioc/inversify.config';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/favorites', authService.authenticate([]))
export class FavoriteMoveController extends BaseHttpController {
  constructor(
    @inject(TYPES.favoriteMoveService) private readonly favoriteMoveService: FavoriteMoveService
  ) {
    super();
  }

  @httpGet('/')
  private async getMine() {
    const { id: userId } = this.httpContext.user.details;
    const moveIds = await this.favoriteMoveService.getFavoriteMoveIds(userId);
    return this.ok(moveIds);
  }

  @httpPost('/:moveId')
  private async add(@requestParam('moveId') moveId: number) {
    if (!moveId || moveId <= 0) {
      return this.badRequest('Move id has to be a positive integer');
    }
    try {
      const { id: userId } = this.httpContext.user.details;
      await this.favoriteMoveService.addFavorite(userId, moveId);
      return this.statusCode(204);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        return this.notFound();
      }
      return this.badRequest(`Could not favorite move with id: ${moveId}`);
    }
  }

  @httpDelete('/:moveId')
  private async remove(@requestParam('moveId') moveId: number) {
    if (!moveId || moveId <= 0) {
      return this.badRequest('Move id has to be a positive integer');
    }
    const { id: userId } = this.httpContext.user.details;
    await this.favoriteMoveService.removeFavorite(userId, moveId);
    return this.statusCode(204);
  }
}
