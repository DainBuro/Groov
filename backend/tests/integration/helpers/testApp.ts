import 'reflect-metadata';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { Application, NextFunction, Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { iocContainer } from '../../../src/ioc/inversify.config';
import { AuthProvider } from '../../../src/authProvider/authProvider';
import { TYPES } from '../../../src/ioc/types';
import { AuthRepository } from '../../../src/repositories/authRepository';
import { EventRepository } from '../../../src/repositories/eventRepository';
import { DanceMoveRepository } from '../../../src/repositories/danceMoveRepository';
import { DanceSequenceRepository } from '../../../src/repositories/danceSequenceRepository';
import { MovesOfSequenceRepository } from '../../../src/repositories/movesOfSequenceRepository';
import { FavoriteMoveRepository } from '../../../src/repositories/favoriteMoveRepository';

export interface TestRepositories {
  authRepository: Partial<AuthRepository>;
  eventRepository: Partial<EventRepository>;
  danceMoveRepository: Partial<DanceMoveRepository>;
  danceSequenceRepository: Partial<DanceSequenceRepository>;
  movesOfSequenceRepository: Partial<MovesOfSequenceRepository>;
  favoriteMoveRepository: Partial<FavoriteMoveRepository>;
}

// Call this before buildTestApp(). Once a service is built it keeps whatever
// repo it got, so swapping repos later has no effect.
export const rebindRepositories = (repos: Partial<TestRepositories>) => {
  if (repos.authRepository) {
    iocContainer.rebind<AuthRepository>(TYPES.authRepository).toConstantValue(repos.authRepository as AuthRepository);
  }
  if (repos.eventRepository) {
    iocContainer
      .rebind<EventRepository>(TYPES.eventRepository)
      .toConstantValue(repos.eventRepository as EventRepository);
  }
  if (repos.danceMoveRepository) {
    iocContainer
      .rebind<DanceMoveRepository>(TYPES.danceMoveRepository)
      .toConstantValue(repos.danceMoveRepository as DanceMoveRepository);
  }
  if (repos.danceSequenceRepository) {
    iocContainer
      .rebind<DanceSequenceRepository>(TYPES.danceSequenceRepository)
      .toConstantValue(repos.danceSequenceRepository as DanceSequenceRepository);
  }
  if (repos.movesOfSequenceRepository) {
    iocContainer
      .rebind<MovesOfSequenceRepository>(TYPES.movesOfSequenceRepository)
      .toConstantValue(repos.movesOfSequenceRepository as MovesOfSequenceRepository);
  }
  if (repos.favoriteMoveRepository) {
    iocContainer
      .rebind<FavoriteMoveRepository>(TYPES.favoriteMoveRepository)
      .toConstantValue(repos.favoriteMoveRepository as FavoriteMoveRepository);
  }
};

let controllersLoaded = false;
const loadControllersOnce = () => {
  if (controllersLoaded) return;
  controllersLoaded = true;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../src/ioc/controllers');
};

export const buildTestApp = (): Application => {
  loadControllersOnce();

  const server = new InversifyExpressServer(iocContainer, null, null, null, AuthProvider);

  server.setConfig((app) => {
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
  });

  server.setErrorConfig((app) => {
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err?.statusCode || 500;
      res.status(status).send(err?.message || 'Internal Server Error');
    });
  });

  return server.build();
};
