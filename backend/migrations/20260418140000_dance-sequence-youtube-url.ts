import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
    ALTER TABLE dance_sequence ADD COLUMN youtube_url VARCHAR(500);
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.raw(`
    ALTER TABLE dance_sequence DROP COLUMN IF EXISTS youtube_url;
  `);
}
