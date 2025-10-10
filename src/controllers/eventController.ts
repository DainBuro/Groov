import {
  controller,
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  requestParam,
  requestBody,
  BaseHttpController
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../ioc/types';
import { EventService } from '../services/eventService';
import { iocContainer } from '../ioc/inversify.config';
import { AuthService } from '../services/authService';
import { Event, RoleType } from '../schema';

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
  private async getAll() {
    const events = await this.eventService.getAllEvents();
    return this.ok(events);
  }

  @httpGet('/:id')
  private async getById(@requestParam('id') id: number) {
    const event = await this.eventService.getEventById(id);
    if (!event) {
      return this.notFound();
    }
    return this.ok(event);
  }

  @httpPost('/', authService.authenticate([RoleType.Admin]))
  private async create(@requestBody() body: Partial<Event>) {
    const result = await this.eventService.createEvent(body);
    return this.ok(result);
  }

  @httpPut('/:id', authService.authenticate([RoleType.Admin]))
  private async update(@requestParam('id') id: number, @requestBody() body: Partial<Event>) {
    const result = await this.eventService.updateEvent(id, body);
    return this.ok(result);
  }

  @httpDelete('/:id', authService.authenticate([RoleType.Admin]))
  private async delete(@requestParam('id') id: number) {
    const result = await this.eventService.deleteEvent(id);
    return this.ok(result);
  }
}
