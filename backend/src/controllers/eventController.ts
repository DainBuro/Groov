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
import { TYPES } from '../ioc/types';
import { EventService } from '../services/eventService';
import { iocContainer } from '../ioc/inversify.config';
import { AuthService } from '../services/authService';
import { Event, RoleType } from '../schema';
import _ from 'lodash';

const authService = iocContainer.get<AuthService>(TYPES.authService);

@controller('/events')
export class EventController extends BaseHttpController {
  constructor(
    @inject(TYPES.eventService)
    private readonly eventService: EventService
  ) {
    super();
  }

  @httpGet('/')
  private async getAll(@queryParam('search') search?: string) {
    const events = await this.eventService.getAllEvents(search);
    return this.ok(events);
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('Event id has to be a positive integer');
      }
      const event = await this.eventService.getEventById(id);
      if (!event) {
        return this.notFound();
      }
      return this.ok(event);
    } catch {
      return this.badRequest('Event id has to be a positive integer');
    }
  }

  @httpPost('/', authService.authenticate([RoleType.Admin]))
  private async create(@requestBody() body: Partial<Event>) {
    if (_.isEmpty(body)) {
      return this.badRequest('Request body cannot be empty.');
    }
    if (body.id) {
      return this.badRequest('ID field is not allowed when creating a new Event.');
    }

    try {
      const result = await this.eventService.createEvent(body);
      return this.created('/events', result);
    } catch {
      return this.badRequest('Could not post event object');
    }
  }

  @httpPut('/:id', authService.authenticate([RoleType.Admin]))
  private async update(@requestParam('id') id: number, @requestBody() body: Partial<Event>) {
    try {
      if (id <= 0) {
        return this.badRequest('Event id has to be a positive integer');
      }
      if (body.id) {
        return this.badRequest('ID field is not allowed when updating an Event.');
      }
      if (_.isEmpty(body)) {
        return this.badRequest('Request body cannot be empty.');
      }

      const event = await this.eventService.getEventById(id);
      if (!event) {
        return this.notFound();
      }

      const result = await this.eventService.updateEvent(id, body);
      if (!result) {
        return this.notFound();
      }
      return this.ok(result[0]);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return this.notFound();
      }
      return this.badRequest(`Could not update event with id: ${id}`);
    }
  }

  @httpDelete('/:id', authService.authenticate([RoleType.Admin]))
  private async delete(@requestParam('id') id: number) {
    try {
      if (id <= 0) {
        return this.badRequest('Event id has to be a positive integer');
      }
      const event = await this.eventService.getEventById(id);
      if (!event) {
        return this.notFound();
      }

      const result = await this.eventService.deleteEvent(id);
      return this.ok(result);
    } catch {
      return this.badRequest('Event id has to be a positive integer');
    }
  }
}
