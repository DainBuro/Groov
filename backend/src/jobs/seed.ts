import fs from 'fs';
import path from 'path';
import knex from 'knex';
import config from '../../knexfile';

const db = knex(config.development);

let sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

db.raw(sql)
  .then(() => {
    console.log('finished');
  })
  .catch((err) => {
    console.error('Error running seed:', err);
  })
  .finally(() => {
    db.destroy();
  });
