import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dance_sequence', (table) => {
    table.integer('creator_id').unsigned().notNullable();
    table.foreign('creator_id').references('id').inTable('app_user').onDelete('CASCADE');
    table.index('creator_id');
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dance_sequence', (table) => {
    table.dropForeign(['creator_id']);
    table.dropColumn('creator_id');
  });
}

