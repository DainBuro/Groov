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
import { DanceSequence, RoleType } from '../schema';
import _ from 'lodash';
import { DanceMoveService } from '../services/danceMoveService';
import { iocContainer } from '../ioc/inversify.config';
import { DanceSequenceService } from '../services/danceSequenceService';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/dance-sequences')
export class DanceSequenceController extends BaseHttpController {
  constructor(@inject(TYPES.danceSequenceService) private readonly danceSequenceService: DanceSequenceService) {
    super();
  }

  @httpGet('/')
  private async getAll() {
    const moves = await this.danceSequenceService.getAllDanceSequences();
    return this.ok(moves);
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    const move = await this.danceSequenceService.getDanceSequence(id);
    if (!move) {
      return this.notFound();
    }
    return this.ok(move);
  }

  @httpPost('/', authService.authenticate([]))
  private async create(@requestBody() body: Omit<DanceSequence, 'id' | 'user_id'>) {
    if (_.isEmpty(body)) {
      return this.badRequest('Request body cannot be empty.');
    }

    try {
      const move = await this.danceSequenceService.createDanceSequence({
        ...body,
        user_id: this.httpContext.user.details.id
      });
      return this.created('/dance-moves', move);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }

  @httpPut('/:id', authService.authenticate([]))
  private async update(@requestParam('id') id: number, @requestBody() body: Omit<DanceSequence, 'id' | 'user_id'>) {
    try {
      const updated = await this.danceSequenceService.updateDanceSequence(id, {
        ...body,
        user_id: this.httpContext.user.details.id
      });
      if (!updated) {
        return this.notFound();
      }
      return this.ok(updated);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }

  @httpDelete('/:id', authService.authenticate([]))
  private async delete(@requestParam('id') id: number) {
    try {
      const deleted = await this.danceSequenceService.deleteDanceSequence(id, this.httpContext.user.details.id);
      if (!deleted) {
        return this.notFound();
      }
      return this.ok(deleted);
    } catch (error: any) {
      return this.badRequest(error.message);
    }
  }
}
