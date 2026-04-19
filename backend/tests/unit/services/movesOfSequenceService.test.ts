import { MovesOfSequenceService } from '../../../src/services/movesOfSequenceService';
import { MovesOfSequenceRepository } from '../../../src/repositories/movesOfSequenceRepository';
import { DanceSequenceRepository } from '../../../src/repositories/danceSequenceRepository';

const makeMoveRepoMock = (): jest.Mocked<Partial<MovesOfSequenceRepository>> => ({
  getMovesOfSequence: jest.fn(),
  deleteAllMovesOfSequence: jest.fn(),
  replaceMovesOfSequence: jest.fn(),
});

const makeSeqRepoMock = (): jest.Mocked<Partial<DanceSequenceRepository>> => ({
  getDanceSequence: jest.fn(),
});

describe('MovesOfSequenceService', () => {
  let moveRepo: jest.Mocked<Partial<MovesOfSequenceRepository>>;
  let seqRepo: jest.Mocked<Partial<DanceSequenceRepository>>;
  let service: MovesOfSequenceService;

  beforeEach(() => {
    moveRepo = makeMoveRepoMock();
    seqRepo = makeSeqRepoMock();
    service = new MovesOfSequenceService(
      moveRepo as unknown as MovesOfSequenceRepository,
      seqRepo as unknown as DanceSequenceRepository
    );
  });

  describe('deleteAllMovesOfSequence', () => {
    it('throws when the sequence does not exist', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue(null as any);
      await expect(service.deleteAllMovesOfSequence(1, 1)).rejects.toThrow('not found');
    });

    it('blocks non-owners', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 2 } as any);
      await expect(service.deleteAllMovesOfSequence(1, 99)).rejects.toThrow('Unauthorized');
    });

    it('deletes all moves for the owner', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      moveRepo.deleteAllMovesOfSequence!.mockResolvedValue(3 as any);

      await expect(service.deleteAllMovesOfSequence(1, 5)).resolves.toBe(3);
      expect(moveRepo.deleteAllMovesOfSequence).toHaveBeenCalledWith(1, undefined);
    });

    it('passes the transaction through to the repository', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      moveRepo.deleteAllMovesOfSequence!.mockResolvedValue(0 as any);
      const trx: any = { commit: jest.fn() };

      await service.deleteAllMovesOfSequence(1, 5, trx);

      expect(moveRepo.deleteAllMovesOfSequence).toHaveBeenCalledWith(1, trx);
    });
  });

  describe('replaceMovesOfSequence', () => {
    it('throws when the sequence does not exist', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue(null as any);
      await expect(service.replaceMovesOfSequence(1, [1, 2], 1)).rejects.toThrow('not found');
    });

    it('blocks non-owners', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 2 } as any);
      await expect(service.replaceMovesOfSequence(1, [1, 2], 99)).rejects.toThrow('Unauthorized');
    });

    it('replaces moves for the owner', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      moveRepo.replaceMovesOfSequence!.mockResolvedValue([{ id: 1 }] as any);

      const result = await service.replaceMovesOfSequence(1, [10, 20], 5);

      expect(result).toEqual([{ id: 1 }]);
      expect(moveRepo.replaceMovesOfSequence).toHaveBeenCalledWith(1, [10, 20], undefined);
    });

    it('passes the transaction through to the repository', async () => {
      seqRepo.getDanceSequence!.mockResolvedValue({ id: 1, user_id: 5 } as any);
      moveRepo.replaceMovesOfSequence!.mockResolvedValue([] as any);
      const trx: any = { commit: jest.fn() };

      await service.replaceMovesOfSequence(1, [10], 5, trx);

      expect(moveRepo.replaceMovesOfSequence).toHaveBeenCalledWith(1, [10], trx);
    });
  });
});
