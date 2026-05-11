import { DanceMoveService } from '../../../src/services/danceMoveService';
import { DanceMoveRepository } from '../../../src/repositories/danceMoveRepository';
import { DifficultyEnum, KeyPositionEnum, RoleType, SubmissionStatusEnum } from '../../../src/schema';

const makeRepoMock = (): jest.Mocked<Partial<DanceMoveRepository>> => ({
  getDanceMove: jest.fn(),
  getAllDanceMoves: jest.fn(),
  getDanceMovesByDifficulty: jest.fn(),
  createDanceMove: jest.fn(),
  updateDanceMove: jest.fn(),
  deleteDanceMove: jest.fn(),
  updateSubmissionStatus: jest.fn(),
  updatePoseData: jest.fn(),
  updatePoseStatus: jest.fn(),
  getChildMoves: jest.fn(),
  getParentMove: jest.fn()
});

const baseMove = {
  name: 'Swingout',
  difficulty: DifficultyEnum.Easy,
  start_position: KeyPositionEnum.Closed,
  end_position: KeyPositionEnum.OpenLeftToRight
};

describe('DanceMoveService', () => {
  let repo: jest.Mocked<Partial<DanceMoveRepository>>;
  let service: DanceMoveService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new DanceMoveService(repo as unknown as DanceMoveRepository);
  });

  describe('getDanceMove', () => {
    it('returns the move when approved', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        submission_status: SubmissionStatusEnum.Approved,
        created_by: 99
      } as any);
      const move = await service.getDanceMove(1, 1, RoleType.User);
      expect(move?.id).toBe(1);
    });

    it('hides non-approved moves from non-owners', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        submission_status: SubmissionStatusEnum.Pending,
        created_by: 99
      } as any);
      const move = await service.getDanceMove(1, 2, RoleType.User);
      expect(move).toBeNull();
    });

    it('shows non-approved moves to their owner', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        submission_status: SubmissionStatusEnum.Pending,
        created_by: 5
      } as any);
      const move = await service.getDanceMove(1, 5, RoleType.User);
      expect(move?.id).toBe(1);
    });

    it('shows non-approved moves to admins', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        submission_status: SubmissionStatusEnum.Pending,
        created_by: 99
      } as any);
      const move = await service.getDanceMove(1, 2, RoleType.Admin);
      expect(move?.id).toBe(1);
    });

    it('returns null when repository returns nothing', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      expect(await service.getDanceMove(1)).toBeNull();
    });
  });

  describe('createDanceMove', () => {
    it('rejects missing required fields', async () => {
      await expect(service.createDanceMove({ name: 'only name' } as any, 1, RoleType.User)).rejects.toThrow(
        'Missing required fields'
      );
    });

    it('marks admin submissions as approved', async () => {
      repo.createDanceMove!.mockImplementation(async (data: any) => ({ ...data, id: 1 }) as any);

      const result = await service.createDanceMove(baseMove as any, 10, RoleType.Admin);

      expect((result as any).submission_status).toBe(SubmissionStatusEnum.Approved);
      expect((result as any).created_by).toBe(10);
    });

    it('marks user submissions as pending', async () => {
      repo.createDanceMove!.mockImplementation(async (data: any) => ({ ...data, id: 1 }) as any);

      const result = await service.createDanceMove(baseMove as any, 7, RoleType.User);

      expect((result as any).submission_status).toBe(SubmissionStatusEnum.Pending);
      expect((result as any).created_by).toBe(7);
    });

    it('strips client-supplied id and status fields', async () => {
      repo.createDanceMove!.mockImplementation(async (data: any) => ({ ...data, id: 99 }) as any);

      await service.createDanceMove(
        { ...baseMove, id: 10, submission_status: SubmissionStatusEnum.Approved, rejection_reason: 'x' } as any,
        7,
        RoleType.User
      );

      const payload = (repo.createDanceMove as jest.Mock).mock.calls[0][0];
      expect(payload.id).toBeUndefined();
      expect(payload.submission_status).toBe(SubmissionStatusEnum.Pending);
      expect(payload.rejection_reason).toBeNull();
    });
  });

  describe('updateDanceMove', () => {
    it('throws when the move does not exist', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      await expect(service.updateDanceMove(1, { name: 'x' }, 1, RoleType.User)).rejects.toThrow('not found');
    });

    it('blocks non-owners from editing', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 2,
        submission_status: SubmissionStatusEnum.Pending
      } as any);
      await expect(service.updateDanceMove(1, { name: 'x' }, 99, RoleType.User)).rejects.toThrow('Not allowed');
    });

    it('blocks non-admins from editing an approved move (even owner)', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 5,
        submission_status: SubmissionStatusEnum.Approved
      } as any);
      await expect(service.updateDanceMove(1, { name: 'x' }, 5, RoleType.User)).rejects.toThrow('Not allowed');
    });

    it('flips rejected → pending when user re-edits', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 5,
        submission_status: SubmissionStatusEnum.Rejected
      } as any);
      repo.updateDanceMove!.mockImplementation(async (data: any) => data as any);

      await service.updateDanceMove(1, { name: 'edit' }, 5, RoleType.User);

      const payload = (repo.updateDanceMove as jest.Mock).mock.calls[0][0];
      expect(payload.submission_status).toBe(SubmissionStatusEnum.Pending);
      expect(payload.rejection_reason).toBeNull();
      expect(payload.name).toBe('edit');
    });

    it('lets admins edit approved moves and does not flip status', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 5,
        submission_status: SubmissionStatusEnum.Approved
      } as any);
      repo.updateDanceMove!.mockImplementation(async (data: any) => data as any);

      await service.updateDanceMove(1, { name: 'admin edit' }, 99, RoleType.Admin);

      const payload = (repo.updateDanceMove as jest.Mock).mock.calls[0][0];
      expect(payload.submission_status).toBeUndefined();
      expect(payload.name).toBe('admin edit');
    });
  });

  describe('deleteDanceMove', () => {
    it('blocks non-owners', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 2,
        submission_status: SubmissionStatusEnum.Pending
      } as any);
      await expect(service.deleteDanceMove(1, 99, RoleType.User)).rejects.toThrow('Not allowed');
    });

    it('blocks owner deleting an approved move', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 5,
        submission_status: SubmissionStatusEnum.Approved
      } as any);
      await expect(service.deleteDanceMove(1, 5, RoleType.User)).rejects.toThrow('Not allowed');
    });

    it('allows admin to delete any move', async () => {
      repo.getDanceMove!.mockResolvedValue({
        id: 1,
        created_by: 5,
        submission_status: SubmissionStatusEnum.Approved
      } as any);
      repo.deleteDanceMove!.mockResolvedValue(1 as any);

      await service.deleteDanceMove(1, 99, RoleType.Admin);

      expect(repo.deleteDanceMove).toHaveBeenCalledWith(1);
    });
  });

  describe('getAllDanceMoves filter routing', () => {
    it('returns empty when requesting "mine" without a requester id', async () => {
      const result = await service.getAllDanceMoves({ mine: true });
      expect(result).toEqual([]);
      expect(repo.getAllDanceMoves).not.toHaveBeenCalled();
    });

    it('passes creatorId when browsing "mine"', async () => {
      repo.getAllDanceMoves!.mockResolvedValue([] as any);
      await service.getAllDanceMoves({ mine: true, requesterId: 7 });
      expect(repo.getAllDanceMoves).toHaveBeenCalledWith({ search: undefined, creatorId: 7 });
    });

    it('restricts non-admins filtering by status to their own submissions', async () => {
      repo.getAllDanceMoves!.mockResolvedValue([] as any);
      await service.getAllDanceMoves({
        status: SubmissionStatusEnum.Pending,
        requesterId: 7,
        requesterRole: RoleType.User
      });
      expect(repo.getAllDanceMoves).toHaveBeenCalledWith({
        search: undefined,
        creatorId: 7,
        statuses: [SubmissionStatusEnum.Pending]
      });
    });

    it('lets admins list by status globally', async () => {
      repo.getAllDanceMoves!.mockResolvedValue([] as any);
      await service.getAllDanceMoves({ status: SubmissionStatusEnum.Pending, requesterRole: RoleType.Admin });
      expect(repo.getAllDanceMoves).toHaveBeenCalledWith({
        search: undefined,
        statuses: [SubmissionStatusEnum.Pending]
      });
    });

    it("default view shows approved plus the requester's own submissions", async () => {
      repo.getAllDanceMoves!.mockResolvedValue([] as any);
      await service.getAllDanceMoves({ requesterId: 5, requesterRole: RoleType.User });
      expect(repo.getAllDanceMoves).toHaveBeenCalledWith({
        search: undefined,
        statuses: [SubmissionStatusEnum.Approved],
        includeOwnedBy: 5
      });
    });

    it('default view for admins does not pin to includeOwnedBy', async () => {
      repo.getAllDanceMoves!.mockResolvedValue([] as any);
      await service.getAllDanceMoves({ requesterId: 2, requesterRole: RoleType.Admin });
      expect(repo.getAllDanceMoves).toHaveBeenCalledWith({
        search: undefined,
        statuses: [SubmissionStatusEnum.Approved],
        includeOwnedBy: undefined
      });
    });

    it('returns empty when non-admin filters by status without a requester id', async () => {
      const result = await service.getAllDanceMoves({
        status: SubmissionStatusEnum.Pending,
        requesterRole: RoleType.User
      });
      expect(result).toEqual([]);
      expect(repo.getAllDanceMoves).not.toHaveBeenCalled();
    });
  });

  describe('approveDanceMove', () => {
    it('throws when the move does not exist', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      await expect(service.approveDanceMove(1)).rejects.toThrow('not found');
    });

    it('updates the submission status to approved', async () => {
      repo.getDanceMove!.mockResolvedValue({ id: 1 } as any);
      repo.updateSubmissionStatus!.mockResolvedValue({ id: 1 } as any);

      await service.approveDanceMove(1);

      expect(repo.updateSubmissionStatus).toHaveBeenCalledWith(1, SubmissionStatusEnum.Approved, null);
    });
  });

  describe('rejectDanceMove', () => {
    it('throws when the move does not exist', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      await expect(service.rejectDanceMove(1, 'nope')).rejects.toThrow('not found');
    });

    it('forwards the rejection reason', async () => {
      repo.getDanceMove!.mockResolvedValue({ id: 1 } as any);
      repo.updateSubmissionStatus!.mockResolvedValue({ id: 1 } as any);

      await service.rejectDanceMove(1, 'too similar');

      expect(repo.updateSubmissionStatus).toHaveBeenCalledWith(1, SubmissionStatusEnum.Rejected, 'too similar');
    });
  });

  describe('uploadPoseData', () => {
    it('throws when the move does not exist', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      await expect(service.uploadPoseData(1, '{}', 'a.json')).rejects.toThrow('not found');
    });

    it('writes pose data and file name when the move exists', async () => {
      repo.getDanceMove!.mockResolvedValue({ id: 1 } as any);
      repo.updatePoseData!.mockResolvedValue({ id: 1 } as any);

      await service.uploadPoseData(1, '{"frames":[]}', 'clip.mp4');

      expect(repo.updatePoseData).toHaveBeenCalledWith(1, '{"frames":[]}', 'clip.mp4');
    });
  });

  describe('deletePoseData', () => {
    it('throws when the move does not exist', async () => {
      repo.getDanceMove!.mockResolvedValue(null as any);
      await expect(service.deletePoseData(1)).rejects.toThrow('not found');
    });

    it('clears pose data via the repository', async () => {
      repo.getDanceMove!.mockResolvedValue({ id: 1 } as any);
      repo.updatePoseData!.mockResolvedValue({ id: 1 } as any);

      await service.deletePoseData(1);

      expect(repo.updatePoseData).toHaveBeenCalledWith(1, null, null);
    });
  });

  describe('getChildMoves / getParentMove', () => {
    it('delegates to the repository with the approved-only flag for children', async () => {
      repo.getChildMoves!.mockResolvedValue([{ id: 2 }] as any);
      await service.getChildMoves(1);
      expect(repo.getChildMoves).toHaveBeenCalledWith(1, true);
    });

    it('delegates to the repository for parent lookup', async () => {
      repo.getParentMove!.mockResolvedValue({ id: 9 } as any);
      const result = await service.getParentMove(1);
      expect(repo.getParentMove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 9 });
    });
  });

  describe('getDanceMovesByDifficulty', () => {
    it('forwards the difficulty filter with the approved-only flag', async () => {
      repo.getDanceMovesByDifficulty!.mockResolvedValue([] as any);
      await service.getDanceMovesByDifficulty(DifficultyEnum.Hard);
      expect(repo.getDanceMovesByDifficulty).toHaveBeenCalledWith(DifficultyEnum.Hard, true);
    });
  });
});
