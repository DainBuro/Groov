import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Single source of truth lives at the project root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getConnectionConfig = () => {
  // SSL is opt-in via DB_SSL=true (e.g. cloud-hosted Postgres). On the internal
  // Docker network DB_SSL stays false — the Postgres image doesn't ship with SSL.
  const useSSL = process.env.DB_SSL === 'true';

  console.log('Database connection config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    ssl: useSSL
  });

  const config: any = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };

  if (useSSL) {
    config.ssl = { rejectUnauthorized: false };
  }

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
    connection: getConnectionConfig(),
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    },
    pool: { min: 2, max: 10 }
  }
};

export default config;
module.exports = config;
