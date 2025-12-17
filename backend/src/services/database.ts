import _ from 'lodash';
import { injectable } from 'inversify';
import knex, { Knex } from 'knex';

export type Item = {
  id: number;
  name: string;
};

@injectable()
export class Database {
  private connection: Knex;

  constructor() {
    this.connection = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      }
    });
  }

  db() {
    return this.connection;
  }
}
