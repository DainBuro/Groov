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

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/sequence-moves')
export class MovesOfSequenceController extends BaseHttpController {
  constructor(
    @inject(TYPES.movesOfSequenceService)
    private readonly movesOfSequenceService: MovesOfSequenceService
  ) {
    super();
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    const moves = await this.movesOfSequenceService.getMovesOfSequence(id);
    if (!moves) {
      return this.notFound();
    }
    return this.ok(moves);
  }

  @httpPut('/:sequenceId', authService.authenticate([]))
  private async replaceMoves(
    @requestParam('sequenceId') sequenceId: number,
    @requestBody() body: { moveIds: number[] }
  ) {
    const result = await this.movesOfSequenceService.replaceMovesOfSequence(
      sequenceId,
      body.moveIds,
      this.httpContext.user.details.id
    );
    return this.ok(result);
  }

  @httpDelete('/:sequenceId', authService.authenticate([]))
  private async deleteMoves(@requestParam('sequenceId') sequenceId: number) {
    const result = await this.movesOfSequenceService.deleteAllMovesOfSequence(
      sequenceId,
      this.httpContext.user.details.id
    );
    return this.ok(result);
  }
}
