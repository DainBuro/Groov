// Covers the pose-extraction pipeline in DanceMoveService by stubbing out
// `child_process.execFile` and the three fs methods the queue uses. The fs
// mock keeps the real module for everything else — knex's internals rely on
// the original fs.

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

import { execFile } from 'child_process';
import * as fs from 'fs';
import { DanceMoveService } from '../../../src/services/danceMoveService';
import { DanceMoveRepository } from '../../../src/repositories/danceMoveRepository';
import { PoseStatusEnum } from '../../../src/schema';

const execFileMock = execFile as unknown as jest.Mock;
const existsSyncMock = fs.existsSync as unknown as jest.Mock;
const unlinkSyncMock = fs.unlinkSync as unknown as jest.Mock;
const readFileSyncMock = fs.readFileSync as unknown as jest.Mock;

const makeRepoMock = (): jest.Mocked<Partial<DanceMoveRepository>> => ({
  getDanceMove: jest.fn(),
  updatePoseData: jest.fn(),
  updatePoseStatus: jest.fn(),
});

// Wait for any chained `.then`/`await` work scheduled inside the execFile
// callback to settle so assertions on repo calls become observable.
const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('DanceMoveService — pose extraction pipeline', () => {
  let repo: jest.Mocked<Partial<DanceMoveRepository>>;
  let service: DanceMoveService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new DanceMoveService(repo as unknown as DanceMoveRepository);

    execFileMock.mockReset();
    existsSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    readFileSyncMock.mockReset();

    // Default: every file is "present" so the cleanup branch in finally runs.
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify({ fps: 30, frames: [[]] }));

    repo.updatePoseStatus!.mockResolvedValue({ id: 1 } as any);
    repo.updatePoseData!.mockResolvedValue({ id: 1 } as any);
  });

  it('throws and deletes the temp video when the move does not exist', async () => {
    repo.getDanceMove!.mockResolvedValue(null);

    await expect(
      service.extractPoseFromVideo(99, '/tmp/video.mp4', 'video.mp4', 2)
    ).rejects.toThrow(/not found/);

    expect(unlinkSyncMock).toHaveBeenCalledWith('/tmp/video.mp4');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('queues a job, kicks off Python, and writes pose data on success', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 1 } as any);

    await service.extractPoseFromVideo(1, '/tmp/v.mp4', 'v.mp4', 2);

    expect(repo.updatePoseStatus).toHaveBeenCalledWith(1, PoseStatusEnum.Processing, null);
    expect(execFileMock).toHaveBeenCalledTimes(1);

    const callback = execFileMock.mock.calls[0][3];
    callback(null, 'done', '');
    await flushMicrotasks();

    expect(repo.updatePoseData).toHaveBeenCalledWith(1, expect.stringContaining('"fps":30'), 'v.mp4');
    expect(repo.updatePoseStatus).toHaveBeenCalledWith(1, PoseStatusEnum.Ready, null);
  });

  it('marks the job as failed when Python errors out', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 2 } as any);

    await service.extractPoseFromVideo(2, '/tmp/v.mp4', 'v.mp4', 1);

    const callback = execFileMock.mock.calls[0][3];
    callback(new Error('python crashed'), '', 'traceback: BOOM');
    await flushMicrotasks();

    const failedCall = repo.updatePoseStatus!.mock.calls.find((c) => c[1] === PoseStatusEnum.Failed);
    expect(failedCall).toBeDefined();
    expect(failedCall![2]).toMatch(/BOOM/);
    expect(repo.updatePoseData).not.toHaveBeenCalled();
  });

  it('marks the job as failed when no output file is produced', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 3 } as any);
    // Output file is missing — return false only for the JSON output path.
    existsSyncMock.mockImplementation((p: string) => !p.includes('pose_output_'));

    await service.extractPoseFromVideo(3, '/tmp/v.mp4', 'v.mp4', 1);

    const callback = execFileMock.mock.calls[0][3];
    callback(null, 'done', '');
    await flushMicrotasks();

    const failedCall = repo.updatePoseStatus!.mock.calls.find((c) => c[1] === PoseStatusEnum.Failed);
    expect(failedCall).toBeDefined();
    expect(failedCall![2]).toMatch(/No output file/i);
  });

  it('marks the job as failed when pose JSON is malformed', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 4 } as any);
    readFileSyncMock.mockReturnValue(JSON.stringify({ notFps: true }));

    await service.extractPoseFromVideo(4, '/tmp/v.mp4', 'v.mp4', 1);

    const callback = execFileMock.mock.calls[0][3];
    callback(null, 'done', '');
    await flushMicrotasks();

    const failedCall = repo.updatePoseStatus!.mock.calls.find((c) => c[1] === PoseStatusEnum.Failed);
    expect(failedCall).toBeDefined();
    expect(failedCall![2]).toMatch(/Invalid pose data/i);
    expect(repo.updatePoseData).not.toHaveBeenCalled();
  });

  it('marks the job as failed when the handler throws', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 5 } as any);
    readFileSyncMock.mockImplementation(() => {
      throw new Error('disk read failed');
    });

    await service.extractPoseFromVideo(5, '/tmp/v.mp4', 'v.mp4', 1);

    const callback = execFileMock.mock.calls[0][3];
    callback(null, 'done', '');
    await flushMicrotasks();

    const failedCall = repo.updatePoseStatus!.mock.calls.find((c) => c[1] === PoseStatusEnum.Failed);
    expect(failedCall).toBeDefined();
    expect(failedCall![2]).toMatch(/disk read failed/);
  });

  it('queues subsequent jobs while one is still running', async () => {
    repo.getDanceMove!.mockResolvedValue({ id: 7 } as any);

    await service.extractPoseFromVideo(7, '/tmp/a.mp4', 'a.mp4', 1);
    await service.extractPoseFromVideo(8, '/tmp/b.mp4', 'b.mp4', 1);

    // Only one execFile call so far — the queue is serial.
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(repo.updatePoseStatus).toHaveBeenCalledWith(8, PoseStatusEnum.Queued, null);

    // Finish the first job — that should drain the queue and start the second.
    const firstCallback = execFileMock.mock.calls[0][3];
    firstCallback(null, 'done', '');
    await flushMicrotasks();

    expect(execFileMock).toHaveBeenCalledTimes(2);
  });
});
