import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5435,
      user: 'admin',
      password: 'admin',
      database: 'groov_db'
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

  // production: {}
};

module.exports = config;

export default config;
