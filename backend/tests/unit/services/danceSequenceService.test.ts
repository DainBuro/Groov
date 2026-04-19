import { DanceSequenceService } from '../../../src/services/danceSequenceService';
import { DanceSequenceRepository } from '../../../src/repositories/danceSequenceRepository';
import { RoleType } from '../../../src/schema';

const makeRepoMock = (): jest.Mocked<Partial<DanceSequenceRepository>> => ({
  getDanceSequence: jest.fn(),
  getAllDanceSequences: jest.fn(),
  createDanceSequence: jest.fn(),
  updateDanceSequence: jest.fn(),
  deleteDanceSequence: jest.fn()
});

describe('DanceSequenceService', () => {
  let repo: jest.Mocked<Partial<DanceSequenceRepository>>;
  let service: DanceSequenceService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new DanceSequenceService(repo as unknown as DanceSequenceRepository);
  });

  it('delegates lookup by id', async () => {
    repo.getDanceSequence!.mockResolvedValue({ id: 1 } as any);
    const result = await service.getDanceSequence(1);
    expect(result?.id).toBe(1);
    expect(repo.getDanceSequence).toHaveBeenCalledWith(1);
  });

  it('forwards both search and creatorId when listing', async () => {
    repo.getAllDanceSequences!.mockResolvedValue([] as any);
    await service.getAllDanceSequences('foo', 7);
    expect(repo.getAllDanceSequences).toHaveBeenCalledWith('foo', 7);
  });

  describe('createDanceSequence', () => {
    it('rejects when name is missing', async () => {
      await expect(service.createDanceSequence({ user_id: 1 } as any)).rejects.toThrow('Missing required fields');
    });

    it('rejects when user_id is missing', async () => {
      await expect(service.createDanceSequence({ name: 'x' } as any)).rejects.toThrow('Missing required fields');
    });

    it('strips the client id before saving', async () => {
      repo.createDanceSequence!.mockImplementation(async (data: any) => ({ ...data, id: 99 }) as any);

      await service.createDanceSequence({ id: 10, name: 'Seq', user_id: 1 } as any);

      const payload = (repo.createDanceSequence as jest.Mock).mock.calls[0][0];
      expect(payload.id).toBeUndefined();
      expect(payload.name).toBe('Seq');
      expect(payload.user_id).toBe(1);
    });
  });

  describe('updateDanceSequence', () => {
    it('throws when the sequence does not exist', async () => {
      repo.getDanceSequence!.mockResolvedValue(null as any);
      await expect(service.updateDanceSequence(1, { user_id: 1 } as any)).rejects.toThrow('not found');
    });

    it('blocks users who are not the creator', async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 2 } as any);
      await expect(service.updateDanceSequence(1, { user_id: 3 } as any, RoleType.User)).rejects.toThrow(
        'not accessible'
      );
    });

    it('lets the creator update their own sequence', async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      repo.updateDanceSequence!.mockImplementation(async (data: any) => data as any);

      const result = await service.updateDanceSequence(1, { user_id: 5, name: 'new' } as any, RoleType.User);

      expect((result as any).name).toBe('new');
      expect((result as any).id).toBe(1);
    });

    it('lets admins override the creator check', async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      repo.updateDanceSequence!.mockImplementation(async (data: any) => data as any);

      const result = await service.updateDanceSequence(1, { user_id: 99, name: 'x' } as any, RoleType.Admin);
      expect(result).not.toBeNull();
    });
  });

  describe('deleteDanceSequence', () => {
    it('throws when the sequence does not exist', async () => {
      repo.getDanceSequence!.mockResolvedValue(null as any);
      await expect(service.deleteDanceSequence(1, 1)).rejects.toThrow('not found');
    });

    it('blocks non-creators', async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 2 } as any);
      await expect(service.deleteDanceSequence(1, 99, RoleType.User)).rejects.toThrow('not accessible');
    });

    it('allows the creator', async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      repo.deleteDanceSequence!.mockResolvedValue(1 as any);
      await expect(service.deleteDanceSequence(1, 5, RoleType.User)).resolves.toBe(1);
      expect(repo.deleteDanceSequence).toHaveBeenCalledWith(1);
    });

    it("allows an admin to delete anyone's sequence", async () => {
      repo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      repo.deleteDanceSequence!.mockResolvedValue(1 as any);
      await expect(service.deleteDanceSequence(1, 999, RoleType.Admin)).resolves.toBe(1);
    });
  });
});
