import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const getConnectionConfig = () => {
  // Force SSL in production, or use DB_SSL env var for other environments
  const useSSL = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true';

  console.log('Database connection config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    ssl: useSSL
  });

  const config: any = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };

  if (useSSL) {
    config.ssl = { rejectUnauthorized: false };
  }

  console.log('Final connection config with SSL:', JSON.stringify(config, null, 2));

  return config;
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: getConnectionConfig(),
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`,
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    },
    pool: { min: 2, max: 10 }
  }
};

export default config;
module.exports = config;
