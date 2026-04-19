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

  it('lists events without a search term', async () => {
    repo.getAllEvents!.mockResolvedValue([] as any);

    await service.getAllEvents();

    expect(repo.getAllEvents).toHaveBeenCalledWith(undefined);
  });

  it('rejects creation without a name', async () => {
    await expect(service.createEvent({} as any)).rejects.toThrow('Event name is required');
    expect(repo.createEvent).not.toHaveBeenCalled();
  });

  it('rejects creation with an empty-string name', async () => {
    await expect(service.createEvent({ name: '' } as any)).rejects.toThrow('Event name is required');
  });

  it('strips the id field before creating', async () => {
    repo.createEvent!.mockResolvedValue([{ id: 1, name: 'Jam' } as any]);

    await service.createEvent({ id: 999, name: 'Jam' } as any);

    const payload = (repo.createEvent as jest.Mock).mock.calls[0][0];
    expect(payload.id).toBeUndefined();
    expect(payload.name).toBe('Jam');
  });

  it('returns repository result on successful create', async () => {
    const created = [{ id: 1, name: 'Jam' }] as any;
    repo.createEvent!.mockResolvedValue(created);

    const result = await service.createEvent({ name: 'Jam' } as any);

    expect(result).toBe(created);
  });

  it('fetches an event by id', async () => {
    repo.getEventById!.mockResolvedValue({ id: 7, name: 'Test' } as any);

    const event = await service.getEventById(7);

    expect(event?.id).toBe(7);
    expect(repo.getEventById).toHaveBeenCalledWith(7);
  });

  it('requires an id on getEventById', async () => {
    await expect(service.getEventById(null as any)).rejects.toThrow('Event ID is required');
    await expect(service.getEventById(undefined as any)).rejects.toThrow('Event ID is required');
  });

  it('requires an id on update', async () => {
    await expect(service.updateEvent(null as any, { name: 'x' })).rejects.toThrow('Event ID is required');
    await expect(service.updateEvent(undefined as any, { name: 'x' })).rejects.toThrow('Event ID is required');
  });

  it('forwards update to the repository', async () => {
    repo.updateEvent!.mockResolvedValue([{ id: 3, name: 'updated' } as any]);

    const result = await service.updateEvent(3, { name: 'updated' });

    expect(repo.updateEvent).toHaveBeenCalledWith(3, { name: 'updated' });
    expect(result).toEqual([{ id: 3, name: 'updated' }]);
  });

  it('requires an id on delete', async () => {
    await expect(service.deleteEvent(null as any)).rejects.toThrow('Event ID is required');
    await expect(service.deleteEvent(undefined as any)).rejects.toThrow('Event ID is required');
  });

  it('delegates delete to the repository', async () => {
    repo.deleteEvent!.mockResolvedValue(1);

    const result = await service.deleteEvent(3);

    expect(result).toBe(1);
    expect(repo.deleteEvent).toHaveBeenCalledWith(3);
  });
});
