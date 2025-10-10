import _ from 'lodash';
import { inject, injectable } from 'inversify';
import { Knex } from 'knex';
import { TYPES } from '../ioc/types';
import { Database } from '../services/database';

@injectable()
export class BaseRepository {
  constructor(@inject(TYPES.database) protected database: Database) {}

  async usingTransaction<T>(queryFn: (trx: Knex.Transaction) => Promise<T>, trx?: Knex.Transaction): Promise<T> {
    if (trx) {
      return queryFn(trx);
    }

    const localTrx = await this.database.db().transaction();

    try {
      // @ts-ignore
      const result = await queryFn(localTrx);

      // @ts-ignore
      await localTrx.commit();

      return result as T;
    } catch (error) {
      // @ts-ignore
      await localTrx.rollback();

      console.error('Transaction rolled back.', error);
      throw error;
    }
  }

  db(trx?: Knex.Transaction) {
    return trx || this.database.db();
  }

  withTransaction(tableName: string, trx?: Knex.Transaction) {
    return trx ? trx(tableName) : this.database.db()(tableName);
  }

  get<T, K extends keyof T = keyof T>(
    tableName: string,
    columns: K[] | '*',
    where?: (query: Knex.QueryBuilder) => void,
    trx?: Knex.Transaction
  ): Promise<Pick<T, K>[]> {
    let query = this.withTransaction(tableName, trx).select(columns);

    if (where) {
      where(query);
    }

    return query;
  }

  insert<T>(tableName: string, entries: Partial<T>[], trx?: Knex.Transaction): Promise<T[]> {
    const query = this.withTransaction(tableName, trx).insert(entries).returning('*');

    return query;
  }

  upsert<T>(tableName: string, entries: Partial<T>[], trx?: Knex.Transaction): Promise<T[]> {
    const query = this.withTransaction(tableName, trx).insert(entries).onConflict(['id']).merge().returning('*');

    return query;
  }

  delete(tableName: string, where: (query: Knex.QueryBuilder) => void, trx?: Knex.Transaction): Knex.QueryBuilder {
    const query = this.withTransaction(tableName, trx).update('deleted', true);
    where(query);

    return query;
  }

  hardDelete(tableName: string, where: (query: Knex.QueryBuilder) => void, trx?: Knex.Transaction): Knex.QueryBuilder {
    const query = this.withTransaction(tableName, trx).delete().returning('*');
    where(query);

    return query;
  }
}
