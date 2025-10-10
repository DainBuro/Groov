import _ from 'lodash';
import { injectable } from 'inversify';
import { Event, Table } from '../schema';
import { BaseRepository } from './baseRepository';

@injectable()
export class EventRepository extends BaseRepository {
  async getAllEvents(): Promise<Event[]> {
    return this.get<Event>(Table.Event, '*', (query) => query.orderBy('date', 'desc'));
  }

  async getEventById(id: number): Promise<Event | null> {
    const [event] = await this.get<Event>(Table.Event, '*', (query) => query.where('id', id));
    return event || null;
  }

  async createEvent(event: Partial<Event>): Promise<Event[]> {
    return this.insert(Table.Event, [event]);
  }

  async updateEvent(id: number, event: Partial<Event>): Promise<Event[]> {
    return this.upsert(Table.Event, [{ ...event, id }]);
  }

  async deleteEvent(id: number): Promise<number> {
    return this.hardDelete(Table.Event, (query) => query.where('id', id));
  }
}
