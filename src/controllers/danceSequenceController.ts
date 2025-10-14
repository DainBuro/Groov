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
import { DanceSequence } from '../schema';
import _ from 'lodash';
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
    try {
      if (id <= 0) {
        return this.badRequest('DanceSequence id has to be a positive integer');
      }
      const sequence = await this.danceSequenceService.getDanceSequence(id);
      if (!sequence) {
        return this.notFound();
      }
      return this.ok(sequence);
    } catch {
      return this.badRequest('DanceSequence id has to be a positive integer');
    }
  }

  @httpPost('/', authService.authenticate([]))
  private async create(@requestBody() body: Partial<DanceSequence>) {
    if (_.isEmpty(body)) {
      return this.badRequest('Request body cannot be empty.');
    }
    if (body.id) {
      return this.badRequest('ID field is not allowed when creating a new Dance sequence.');
    }

    try {
      const move = await this.danceSequenceService.createDanceSequence({
        ...body,
        user_id: this.httpContext.user.details.id
      });
      return this.created('/dance-sequences', move);
    } catch {
      return this.badRequest('Could not post dance sequence object');
    }
  }

  @httpPut('/:id', authService.authenticate([]))
  private async update(@requestParam('id') id: number, @requestBody() body: Partial<DanceSequence>) {
    try {
      if (id <= 0) {
        return this.badRequest('DanceSequence id has to be a positive integer');
      }
      if (_.isEmpty(body)) {
        return this.badRequest('Request body cannot be empty.');
      }

      const sequence = await this.danceSequenceService.getDanceSequence(id);
      if (!sequence) {
        return this.notFound();
      }
      const updated = await this.danceSequenceService.updateDanceSequence(id, {
        ...body,
        user_id: this.httpContext.user.details.id
      });
      return this.ok(updated);
    } catch {
      return this.badRequest(`Could not update dance sequence with id: ${id}`);
    }
  }

  @httpDelete('/:id', authService.authenticate([]))
  private async delete(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('DanceSequence id has to be a positive integer');
      }
      const sequence = await this.danceSequenceService.getDanceSequence(id);
      if (!sequence) {
        return this.notFound();
      }
      const deleted = await this.danceSequenceService.deleteDanceSequence(id, this.httpContext.user.details.id);

      return this.ok(deleted);
    } catch {
      return this.badRequest(`Could not delete dance sequence with id: ${id}`);
    }
  }
}
