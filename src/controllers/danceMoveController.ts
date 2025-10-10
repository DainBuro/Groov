import {
  controller,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  requestParam,
  requestBody,
  BaseHttpController
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import { RoleType } from '../schema';
import _ from 'lodash';
import { DanceMoveService } from '../services/danceMoveService';
import { iocContainer } from '../ioc/inversify.config';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/dance-moves')
export class DanceMoveController extends BaseHttpController {
  constructor(@inject(TYPES.danceMoveService) private readonly danceMoveService: DanceMoveService) {
    super();
  }

  @httpGet('/')
  private async getAll() {
    const moves = await this.danceMoveService.getAllDanceMoves();
    return this.ok(moves);
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    const move = await this.danceMoveService.getDanceMove(id);
    if (!move) {
      return this.notFound();
    }
    return this.ok(move);
  }

  @httpGet('/difficulty/:difficulty')
  private async getByDifficulty(@requestParam('difficulty') difficulty: string) {
    const moves = await this.danceMoveService.getDanceMovesByDifficulty(difficulty);
    return this.ok(moves);
  }

  @httpPost('/', authService.authenticate([RoleType.Admin]))
  private async create(@requestBody() body: any) {
    if (_.isEmpty(body)) {
      return this.badRequest('Request body cannot be empty.');
    }

    try {
      const move = await this.danceMoveService.createDanceMove(body);
      return this.created('/dance-moves', move);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }

  @httpPut('/:id', authService.authenticate([RoleType.Admin]))
  private async update(@requestParam('id') id: number, @requestBody() body: any) {
    try {
      const updated = await this.danceMoveService.updateDanceMove(id, body);
      if (!updated) {
        return this.notFound();
      }
      return this.ok(updated);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }

  @httpDelete('/:id', authService.authenticate([RoleType.Admin]))
  private async delete(@requestParam('id') id: number) {
    try {
      const deleted = await this.danceMoveService.deleteDanceMove(id);
      if (!deleted) {
        return this.notFound();
      }
      return this.ok(deleted);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }

  @httpGet('/:id/children')
  private async getChildren(@requestParam('id') parentMoveId: number) {
    const children = await this.danceMoveService.getChildMoves(parentMoveId);
    return this.ok(children);
  }

  @httpGet('/:id/parent')
  private async getParent(@requestParam('id') childMoveId: number) {
    const parent = await this.danceMoveService.getParentMove(childMoveId);
    if (!parent) {
      return this.notFound();
    }
    return this.ok(parent);
  }
}
