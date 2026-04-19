import { EventService } from '../../../src/services/eventService';
import { EventRepository } from '../../../src/repositories/eventRepository';

const makeRepoMock = (): jest.Mocked<Partial<EventRepository>> => ({
  getAllEvents: jest.fn(),
  getEventById: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
});

describe('EventService', () => {
  let repo: jest.Mocked<Partial<EventRepository>>;
  let service: EventService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new EventService(repo as unknown as EventRepository);
  });

  it('lists events and forwards the search term', async () => {
    repo.getAllEvents!.mockResolvedValue([{ id: 1, name: 'Jam' } as any]);

    const events = await service.getAllEvents('Jam');

    expect(repo.getAllEvents).toHaveBeenCalledWith('Jam');
    expect(events).toHaveLength(1);
  });

  it('rejects creation without a name', async () => {
    await expect(service.createEvent({} as any)).rejects.toThrow('Event name is required');
    expect(repo.createEvent).not.toHaveBeenCalled();
  });

  it('strips the id field before creating', async () => {
    repo.createEvent!.mockResolvedValue([{ id: 1, name: 'Jam' } as any]);

    await service.createEvent({ id: 999, name: 'Jam' } as any);

    const payload = (repo.createEvent as jest.Mock).mock.calls[0][0];
    expect(payload.id).toBeUndefined();
    expect(payload.name).toBe('Jam');
  });

  it('fetches an event by id', async () => {
    repo.getEventById!.mockResolvedValue({ id: 7, name: 'Test' } as any);

    const event = await service.getEventById(7);

    expect(event?.id).toBe(7);
    expect(repo.getEventById).toHaveBeenCalledWith(7);
  });

  it('requires an id on getEventById', async () => {
    await expect(service.getEventById(null as any)).rejects.toThrow('Event ID is required');
  });
});
