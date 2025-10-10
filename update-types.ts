const { knex } = require('knex');
const { updateTypes } = require('knex-types');

const db = knex(require('./knexfile.ts').development);

updateTypes(db, { output: './src/schema.ts' }).catch((err) => {
  console.error(err);
  process.exit(1);
});
