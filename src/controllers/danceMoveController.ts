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
import { DanceMove, DifficultyEnum, RoleType } from '../schema';
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
    try {
      if (id <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }
      const move = await this.danceMoveService.getDanceMove(id);
      if (!move) {
        return this.notFound();
      }
      return this.ok(move);
    } catch {
      return this.badRequest('DanceMove id has to be a positive integer');
    }
  }

  @httpGet('/difficulty/:difficulty')
  private async getByDifficulty(@requestParam('difficulty') difficulty: DifficultyEnum) {
    if (!Object.values(DifficultyEnum).includes(difficulty)) {
      return this.badRequest(`Invalid difficulty value: ${difficulty}`);
    }

    const moves = await this.danceMoveService.getDanceMovesByDifficulty(difficulty);
    return this.ok(moves);
  }

  @httpPost('/', authService.authenticate([RoleType.Admin]))
  private async create(@requestBody() body: Partial<DanceMove>) {
    if (_.isEmpty(body)) {
      return this.badRequest('Request body cannot be empty.');
    }
    if (body.id) {
      return this.badRequest('ID field is not allowed when creating a new DanceMove.');
    }

    try {
      const move = await this.danceMoveService.createDanceMove(body);
      return this.created('/dance-moves', move);
    } catch {
      return this.badRequest('Could not post dance move object');
    }
  }

  @httpPut('/:id', authService.authenticate([RoleType.Admin]))
  private async update(@requestParam('id') id: number, @requestBody() body: Partial<DanceMove>) {
    let updated: DanceMove | null = null;

    try {
      if (id <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }
      if (body.id) {
        return this.badRequest('ID field is not allowed when updating a new DanceMove.');
      }

      updated = await this.danceMoveService.updateDanceMove(id, body);

      return this.ok(updated);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return this.notFound();
      }

      return this.badRequest(`Could not update dance move with id: ${id}`);
    }
  }

  @httpDelete('/:id', authService.authenticate([RoleType.Admin]))
  private async delete(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }
      const deleted = await this.danceMoveService.deleteDanceMove(id);
      return this.ok(deleted);
    } catch {
      return this.notFound();
    }
  }

  @httpGet('/:id/children')
  private async getChildren(@requestParam('id') parentMoveId: number) {
    try {
      if (parentMoveId <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }
      const move = await this.danceMoveService.getDanceMove(parentMoveId);
      if (!move) {
        return this.notFound();
      }
      const children = await this.danceMoveService.getChildMoves(parentMoveId);
      return this.ok(children);
    } catch {
      return this.badRequest('DanceMove id has to be a positive integer');
    }
  }

  @httpGet('/:id/parent')
  private async getParent(@requestParam('id') childMoveId: number) {
    try {
      if (childMoveId <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }
      const move = await this.danceMoveService.getDanceMove(childMoveId);
      if (!move) {
        return this.notFound();
      }
      const parent = await this.danceMoveService.getParentMove(childMoveId);
      return this.ok(parent);
    } catch {
      return this.badRequest('DanceMove id has to be a positive integer');
    }
  }
}
