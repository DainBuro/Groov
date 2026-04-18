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
import { Request } from 'express';
import multer from 'multer';
import * as os from 'os';
import { TYPES } from '../ioc/types';
import { AuthService } from '../services/authService';
import { DanceMove, DifficultyEnum, RoleType } from '../schema';
import _ from 'lodash';
import { DanceMoveService } from '../services/danceMoveService';
import { iocContainer } from '../ioc/inversify.config';

// Big videos go to disk, not memory.
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
      cb(null, `pose_video_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/dance-moves')
export class DanceMoveController extends BaseHttpController {
  constructor(@inject(TYPES.danceMoveService) private readonly danceMoveService: DanceMoveService) {
    super();
  }

  @httpGet('/')
  private async getAll(@queryParam('search') search?: string) {
    const moves = await this.danceMoveService.getAllDanceMoves(search);
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

  @httpPost('/:id/pose', authService.authenticate([RoleType.Admin]), upload.single('video'))
  private async uploadPose(@requestParam('id') id: number) {
    const fs = require('fs');
    const req = this.httpContext.request as unknown as Request;
    const file = req.file;

    try {
      if (id <= 0) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return this.badRequest('DanceMove id has to be a positive integer');
      }

      if (!file) {
        return this.badRequest('No file uploaded. Expected a video file in the "video" field.');
      }

      const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
      const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!validExtensions.includes(ext)) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return this.badRequest(`Invalid file type. Accepted: ${validExtensions.join(', ')}`);
      }

      const numPoses = parseInt(req.body.numPoses) || 2;
      if (numPoses < 1 || numPoses > 4) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return this.badRequest('numPoses must be between 1 and 4.');
      }

      // Kick off the extraction in the background and return the move right away.
      const updated = await this.danceMoveService.extractPoseFromVideo(
        id, file.path, file.originalname, numPoses
      );
      return this.ok(updated);
    } catch (err: any) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (err.message.includes('not found')) {
        return this.notFound();
      }
      console.error('Pose extraction error:', err.message);
      return this.badRequest(err.message || 'Could not start pose extraction.');
    }
  }

  @httpDelete('/:id/pose', authService.authenticate([RoleType.Admin]))
  private async deletePose(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('DanceMove id has to be a positive integer');
      }

      const updated = await this.danceMoveService.deletePoseData(id);
      return this.ok(updated);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return this.notFound();
      }
      return this.badRequest('Could not delete pose data.');
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
