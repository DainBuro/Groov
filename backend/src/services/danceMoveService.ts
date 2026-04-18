import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { DanceMove, DifficultyEnum, PoseStatusEnum } from '../schema';
import { DanceMoveRepository } from '../repositories/danceMoveRepository';
import { TYPES } from '../ioc/types';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface PoseJob {
  moveId: number;
  videoPath: string;
  originalName: string;
  numPoses: number;
}

@injectable()
export class DanceMoveService {
  // One pose job at a time, otherwise we run out of memory.
  private poseQueue: PoseJob[] = [];
  private poseRunning = false;

  constructor(@inject(TYPES.danceMoveRepository) private danceMoveRepository: DanceMoveRepository) {}
  async getDanceMove(id: number): Promise<DanceMove | null> {
    return this.danceMoveRepository.getDanceMove(id);
  }

  async getAllDanceMoves(search?: string) {
    return this.danceMoveRepository.getAllDanceMoves(search);
  }

  async getDanceMovesByDifficulty(difficulty: DifficultyEnum): Promise<DanceMove[]> {
    return this.danceMoveRepository.getDanceMovesByDifficulty(difficulty);
  }

  async createDanceMove(data: Partial<DanceMove>): Promise<DanceMove> {
    if (!data.name || !data.difficulty || !data.start_position || !data.end_position) {
      throw new Error('Missing required fields to create a dance move.');
    }
    const { id, ...safeData } = data;

    return this.danceMoveRepository.createDanceMove(safeData);
  }

  async updateDanceMove(id: number, data: Partial<DanceMove>): Promise<DanceMove | null> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.updateDanceMove({ ...data, id });
  }

  async deleteDanceMove(id: number): Promise<any> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.deleteDanceMove(id);
  }

  async uploadPoseData(id: number, poseData: string, fileName: string): Promise<DanceMove | null> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.updatePoseData(id, poseData, fileName);
  }

  // Queues the video and returns right away. UI polls status to see progress.
  async extractPoseFromVideo(
    id: number,
    videoPath: string,
    originalName: string,
    numPoses: number = 1
  ): Promise<DanceMove | null> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      throw new Error(`Dance move with ID ${id} not found.`);
    }

    this.poseQueue.push({ moveId: id, videoPath, originalName, numPoses });
    const initialStatus = this.poseRunning ? PoseStatusEnum.Queued : PoseStatusEnum.Processing;
    await this.danceMoveRepository.updatePoseStatus(id, initialStatus, null);

    // Does nothing if a job is already running.
    this.processPoseQueue();

    return this.danceMoveRepository.getDanceMove(id);
  }

  private processPoseQueue(): void {
    if (this.poseRunning) return;
    const job = this.poseQueue.shift();
    if (!job) return;

    this.poseRunning = true;

    this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Processing, null).catch(() => {});

    const outputPath = path.join(os.tmpdir(), `pose_output_${job.moveId}_${Date.now()}.json`);
    const scriptPath = path.resolve(__dirname, '../../../tools/extract_pose.py');
    const args = [scriptPath, job.videoPath, '-o', outputPath, '--num-poses', String(job.numPoses), '--model', 'm'];

    execFile('python', args, { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
      try {
        if (error) {
          console.error(`[Pose extraction ${job.moveId}] Failed:`, stderr);
          await this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Failed, stderr || error.message);
          return;
        }

        console.log(`[Pose extraction ${job.moveId}] Completed:`, stdout);

        if (!fs.existsSync(outputPath)) {
          await this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Failed, 'No output file produced');
          return;
        }

        const poseData = fs.readFileSync(outputPath, 'utf-8');
        const parsed = JSON.parse(poseData);
        if (typeof parsed.fps !== 'number' || !Array.isArray(parsed.frames)) {
          await this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Failed, 'Invalid pose data produced');
          return;
        }

        await this.danceMoveRepository.updatePoseData(job.moveId, poseData, job.originalName);
        await this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Ready, null);
      } catch (err: any) {
        console.error(`[Pose extraction ${job.moveId}] Handler error:`, err);
        await this.danceMoveRepository.updatePoseStatus(job.moveId, PoseStatusEnum.Failed, err.message);
      } finally {
        // Clean up temp files.
        if (fs.existsSync(job.videoPath)) fs.unlinkSync(job.videoPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        this.poseRunning = false;
        this.processPoseQueue();
      }
    });
  }

  async deletePoseData(id: number): Promise<DanceMove | null> {
    const existing = await this.danceMoveRepository.getDanceMove(id);
    if (!existing) {
      throw new Error(`Dance move with ID ${id} not found.`);
    }
    return this.danceMoveRepository.updatePoseData(id, null, null);
  }

  async getChildMoves(parentMoveId: number): Promise<DanceMove[]> {
    return this.danceMoveRepository.getChildMoves(parentMoveId);
  }

  async getParentMove(childMoveId: number): Promise<DanceMove | null> {
    return this.danceMoveRepository.getParentMove(childMoveId);
  }
}
