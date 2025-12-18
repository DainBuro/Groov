import {
  controller,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  requestParam,
  requestBody,
  queryParam,
  BaseHttpController
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import { DanceSequence, RoleType } from '../schema';
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
  private async getAll(@queryParam('search') search?: string, @queryParam('creatorId') creatorId?: number) {
    const sequences = await this.danceSequenceService.getAllDanceSequences(search, creatorId);
    return this.ok(sequences);
  }

  @httpGet('/my', authService.authenticate([]))
  private async getMySequences(@queryParam('search') search?: string) {
    const sequences = await this.danceSequenceService.getAllDanceSequences(search, this.httpContext.user.details.id);
    return this.ok(sequences);
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
      const userId = this.httpContext.user.details.id;
      const sequence = await this.danceSequenceService.createDanceSequence({
        ...body,
        user_id: userId
      });
      return this.created('/dance-sequences', sequence);
    } catch (error: any) {
      return this.badRequest(error.message || 'Could not post dance sequence object');
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

      const userId = this.httpContext.user.details.id;
      const userRole = this.httpContext.user.details.role;

      const updated = await this.danceSequenceService.updateDanceSequence(id, { ...body, user_id: userId }, userRole);
      return this.ok(updated);
    } catch (error: any) {
      return this.badRequest(error.message || `Could not update dance sequence with id: ${id}`);
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

      const userId = this.httpContext.user.details.id;
      const userRole = this.httpContext.user.details.role;

      const deleted = await this.danceSequenceService.deleteDanceSequence(id, userId, userRole);

      return this.ok(deleted);
    } catch (error: any) {
      return this.badRequest(error.message || `Could not delete dance sequence with id: ${id}`);
    }
  }
}
