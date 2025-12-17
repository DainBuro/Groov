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
import { MovesOfSequenceService } from '../services/movesOfSequenceService';
import { AuthService } from '../services/authService';
import { iocContainer } from '../ioc/inversify.config';
import _ from 'lodash';
import { DanceSequenceService } from '../services/danceSequenceService';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/sequence-moves')
export class MovesOfSequenceController extends BaseHttpController {
  constructor(
    @inject(TYPES.movesOfSequenceService)
    private readonly movesOfSequenceService: MovesOfSequenceService,
    @inject(TYPES.danceSequenceService)
    private readonly danceSequenceService: DanceSequenceService
  ) {
    super();
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('Sequence id has to be a positive integer');
      }
      const sequence = await this.danceSequenceService.getDanceSequence(id);
      if (!sequence) {
        return this.notFound();
      }
      const moves = await this.movesOfSequenceService.getMovesOfSequence(id);
      if (!moves) {
        return this.notFound();
      }
      return this.ok(moves);
    } catch {
      return this.badRequest('Sequence id has to be a positive integer');
    }
  }

  @httpPut('/:sequenceId', authService.authenticate([]))
  private async replaceMoves(
    @requestParam('sequenceId') sequenceId: number,
    @requestBody() body: { moveIds: number[] }
  ) {
    try {
      if (sequenceId <= 0) {
        return this.badRequest('Sequence id has to be a positive integer');
      }
      if (_.isEmpty(body)) {
        return this.badRequest('Request body cannot be empty.');
      }
      if (!Array.isArray(body.moveIds)) {
        return this.badRequest('moveIds must be an array of numbers');
      }
      if (body.moveIds.some((id) => id <= 0)) {
        return this.badRequest('All move IDs must be positive integers');
      }

      const sequence = await this.danceSequenceService.getDanceSequence(sequenceId);
      if (!sequence) {
        return this.notFound();
      }

      const result = await this.movesOfSequenceService.replaceMovesOfSequence(
        sequenceId,
        body.moveIds,
        this.httpContext.user.details.id
      );
      return this.ok(result);
    } catch (error: any) {
      return this.badRequest(`Could not replace moves for sequence with id: ${sequenceId}`);
    }
  }

  @httpDelete('/:sequenceId', authService.authenticate([]))
  private async deleteMoves(@requestParam('sequenceId') sequenceId: number) {
    try {
      if (sequenceId <= 0) {
        return this.badRequest('Sequence id has to be a positive integer');
      }
      const sequence = await this.danceSequenceService.getDanceSequence(sequenceId);
      if (!sequence) {
        return this.notFound();
      }
      const result = await this.movesOfSequenceService.deleteAllMovesOfSequence(
        sequenceId,
        this.httpContext.user.details.id
      );
      return this.ok(result);
    } catch (error: any) {
      return this.badRequest(`Could not delete moves for sequence with id: ${sequenceId}`);
    }
  }
}
