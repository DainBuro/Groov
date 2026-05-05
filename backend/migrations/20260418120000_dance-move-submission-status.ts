import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
    CREATE TYPE submission_status_enum AS ENUM ('pending', 'approved', 'rejected');

    ALTER TABLE dance_move
      ADD COLUMN submission_status submission_status_enum NOT NULL DEFAULT 'approved',
      ADD COLUMN created_by INT REFERENCES app_user(id) ON DELETE SET NULL,
      ADD COLUMN rejection_reason TEXT;
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.raw(`
    ALTER TABLE dance_move
      DROP COLUMN IF EXISTS rejection_reason,
      DROP COLUMN IF EXISTS created_by,
      DROP COLUMN IF EXISTS submission_status;

    DROP TYPE IF EXISTS submission_status_enum;
  `);
}
