import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS favorite_move (
      user_id INT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      move_id INT NOT NULL REFERENCES dance_move(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, move_id)
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.raw(`
    DROP TABLE IF EXISTS favorite_move;
  `);
}
