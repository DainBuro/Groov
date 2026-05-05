import type { Knex } from 'knex';

// ALTER TYPE ... ADD VALUE must run outside a transaction in Postgres.
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TYPE key_position_enum ADD VALUE IF NOT EXISTS 'any';`);
}

export async function down(knex: Knex): Promise<void> {
  // Postgres doesn't support removing enum values directly — rebuild the enum.
  await knex.raw(`
    UPDATE dance_move SET start_position = 'closed' WHERE start_position = 'any';
    UPDATE dance_move SET end_position = 'closed' WHERE end_position = 'any';

    CREATE TYPE key_position_enum_new AS ENUM (
      'closed',
      'openLeftToRight',
      'openRightToRight',
      'openLeftToLeft',
      'openRightToLeft',
      'sweethearts'
    );

    ALTER TABLE dance_move
      ALTER COLUMN start_position TYPE key_position_enum_new
        USING start_position::text::key_position_enum_new,
      ALTER COLUMN end_position TYPE key_position_enum_new
        USING end_position::text::key_position_enum_new;

    DROP TYPE key_position_enum;
    ALTER TYPE key_position_enum_new RENAME TO key_position_enum;
  `);
}
