import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.raw(`
    -- ENUM TYPES
    CREATE TYPE key_position_enum AS ENUM (
      'closed',
      'openLeftToRight',
      'openRightToRight',
      'openLeftToLeft',
      'openRightToLeft',
      'sweethearts'
    );

    CREATE TYPE difficulty_enum AS ENUM (
      'easy',
      'medium',
      'hard',
      'very_hard'
    );

    CREATE TYPE role_type AS ENUM ('admin', 'user');

    -- USERS
    CREATE TABLE IF NOT EXISTS app_user (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      role role_type NOT NULL,
      deleted BOOLEAN NOT NULL DEFAULT FALSE
    );

    -- EVENTS
    CREATE TABLE IF NOT EXISTS event (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      location VARCHAR(150),
      date DATE
    );

    -- DANCE SEQUENCES
    CREATE TABLE IF NOT EXISTS dance_sequence (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      event_id INT REFERENCES event(id) ON DELETE SET NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT
    );

    -- DANCE MOVES
    CREATE TABLE IF NOT EXISTS dance_move (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      difficulty difficulty_enum NOT NULL,
      start_position key_position_enum NOT NULL,
      end_position key_position_enum NOT NULL,
      parent_move_id INT REFERENCES dance_move(id) ON DELETE SET NULL
    );

    -- MOVE OF SEQUENCE (association table)
    CREATE TABLE IF NOT EXISTS move_of_sequence (
      id SERIAL PRIMARY KEY,
      sequence_id INT NOT NULL REFERENCES dance_sequence(id) ON DELETE CASCADE,
      move_id INT NOT NULL REFERENCES dance_move(id) ON DELETE CASCADE,
      order_index INT NOT NULL
    );

    -- RATINGS
    CREATE TABLE IF NOT EXISTS rating (
      sequence_id INT NOT NULL REFERENCES dance_sequence(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      score INT CHECK (score BETWEEN 1 AND 10),
      PRIMARY KEY (sequence_id, user_id)
      );
      
    -- REFRESH TOKENS
    CREATE TABLE IF NOT EXISTS refresh_token ( 
    id SERIAL PRIMARY KEY, 
    user_id INT NOT NULL, 
    token TEXT NOT NULL UNIQUE, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, 
    expires_at TIMESTAMPTZ NOT NULL, 
    FOREIGN KEY (user_id) REFERENCES app_user(id) 
    );
  `);
}

export async function down(knex: Knex): Promise<void> {
  return knex.raw(`
    DROP TABLE IF EXISTS refresh_token;
    DROP TABLE IF EXISTS rating;
    DROP TABLE IF EXISTS move_of_sequence;
    DROP TABLE IF EXISTS dance_move;
    DROP TABLE IF EXISTS dance_sequence;
    DROP TABLE IF EXISTS event;
    DROP TABLE IF EXISTS app_user;

    DROP TYPE IF EXISTS difficulty_enum;
    DROP TYPE IF EXISTS key_position_enum;
    DROP TYPE IF EXISTS role_type;
  `);
}
