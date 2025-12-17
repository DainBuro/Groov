import 'reflect-metadata';
import 'dotenv/config';
import './ioc/controllers';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { iocContainer } from './ioc/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';
import cors from 'cors';
import { AuthProvider } from './authProvider/authProvider';
import { NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger/swagger.json';

const port = process.env.PORT || 3003;

const server = new InversifyExpressServer(iocContainer, null, null, null, AuthProvider);

server.setConfig((app) => {
  app.use(cookieParser());

  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(bodyParser.json());

  app.use(
    cors({
      origin: ['http://localhost:3000'],
      credentials: true
    })
  );

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  );

  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}]`, req.method, req.url, '→', 'request body:', req.body);
    return next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} → response: ${res.statusCode} (${duration}ms)`
      );
    });

    next();
  });
});

server.setErrorConfig((app) => {
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).send(message);
  });
});
const app = server.build();
app.listen(port, () => console.log(`Application is listening on port ${port}`));
