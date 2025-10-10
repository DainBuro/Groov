import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { Event } from '../schema';
import { TYPES } from '../ioc/types';
import { EventRepository } from '../repositories/eventRepository';

@injectable()
export class EventService {
  constructor(
    @inject(TYPES.eventRepository)
    private eventRepository: EventRepository
  ) {}

  async getAllEvents(): Promise<Event[]> {
    return this.eventRepository.getAllEvents();
  }

  async getEventById(id: number): Promise<Event | null> {
    if (_.isEmpty(id)) {
      throw new Error('Event ID is required');
    }
    return this.eventRepository.getEventById(id);
  }

  async createEvent(event: Partial<Event>): Promise<Event[]> {
    if (_.isEmpty(event.name)) {
      throw new Error('Event name is required');
    }
    return this.eventRepository.createEvent(event);
  }

  async updateEvent(id: number, event: Partial<Event>): Promise<Event[]> {
    if (_.isEmpty(id)) {
      throw new Error('Event ID is required');
    }
    return this.eventRepository.updateEvent(id, event);
  }

  async deleteEvent(id: number): Promise<number> {
    if (_.isEmpty(id)) {
      throw new Error('Event ID is required');
    }
    return this.eventRepository.deleteEvent(id);
  }
}
