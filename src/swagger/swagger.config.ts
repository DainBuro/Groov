import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Groov API Documentation',
      version: '1.0.0',
      description: 'API documentation Groov app'
    },
    servers: [
      {
        url: 'http://localhost:3005'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
