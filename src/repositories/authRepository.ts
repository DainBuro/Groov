import _ from 'lodash';
import { injectable } from 'inversify';
import { AppUser, RefreshToken, Table } from '../schema';
import { Knex } from 'knex';
import { BaseRepository } from './baseRepository';

@injectable()
export class AuthRepository extends BaseRepository {
  async getUserByUsername(username?: string) {
    if (_.isEmpty(username)) {
      return null;
    }

    const [user] = await this.get<AppUser>(Table.AppUser, '*', (query) => query.where('username', username));

    return user;
  }

  async addUser(user: Omit<AppUser, 'id'>, trx?: Knex.Transaction) {
    return this.upsert<AppUser>(Table.AppUser, [user], trx);
  }

  async addRefreshToken(token: Omit<RefreshToken, 'id'>, trx?: Knex.Transaction) {
    return this.insert(Table.RefreshToken, [token], trx);
  }

  async getRefreshTokenUserId(token: string, trx?: Knex.Transaction) {
    const result = await this.get<RefreshToken, 'user_id'>(
      Table.RefreshToken,
      ['user_id'],
      (query) => query.where('token', token),
      trx
    );
    return result;
  }

  async deleteRefreshToken(token: string, trx?: Knex.Transaction) {
    return this.hardDelete(Table.RefreshToken, (query) => query.where('token', token), trx);
  }
}
