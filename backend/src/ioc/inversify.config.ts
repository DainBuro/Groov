import { Container } from 'inversify';
import { TYPES } from './types';
import { AuthService } from '../services/authService';
import { AuthRepository } from '../repositories/authRepository';
import { Database } from '../services/database';
import { DanceMoveService } from '../services/danceMoveService';
import { DanceMoveRepository } from '../repositories/danceMoveRepository';
import { MovesOfSequenceService } from '../services/movesOfSequenceService';
import { MovesOfSequenceRepository } from '../repositories/movesOfSequenceRepository';
import { DanceSequenceService } from '../services/danceSequenceService';
import { DanceSequenceRepository } from '../repositories/danceSequenceRepository';
import { EventService } from '../services/eventService';
import { EventRepository } from '../repositories/eventRepository';

const createIocContainer = () => {
  const container = new Container();

  container.bind<AuthService>(TYPES.authService).to(AuthService).inSingletonScope();
  container.bind<AuthRepository>(TYPES.authRepository).to(AuthRepository).inSingletonScope();
  container.bind<DanceMoveService>(TYPES.danceMoveService).to(DanceMoveService).inSingletonScope();
  container.bind<DanceMoveRepository>(TYPES.danceMoveRepository).to(DanceMoveRepository).inSingletonScope();
  container.bind<DanceSequenceService>(TYPES.danceSequenceService).to(DanceSequenceService).inSingletonScope();
  container.bind<DanceSequenceRepository>(TYPES.danceSequenceRepository).to(DanceSequenceRepository).inSingletonScope();
  container.bind<MovesOfSequenceService>(TYPES.movesOfSequenceService).to(MovesOfSequenceService).inSingletonScope();
  container
    .bind<MovesOfSequenceRepository>(TYPES.movesOfSequenceRepository)
    .to(MovesOfSequenceRepository)
    .inSingletonScope();
  container.bind<EventService>(TYPES.eventService).to(EventService).inSingletonScope();
  container.bind<EventRepository>(TYPES.eventRepository).to(EventRepository).inSingletonScope();
  container.bind<Database>(TYPES.database).to(Database).inSingletonScope();

  return container;
};

const iocContainer = createIocContainer();

export { iocContainer, createIocContainer };
