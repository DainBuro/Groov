// The TypeScript definitions below are automatically generated.
// Do not touch them, or risk, your modifications being lost.

export enum DifficultyEnum {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
  VeryHard = 'very_hard'
}

export enum KeyPositionEnum {
  Closed = 'closed',
  OpenLeftToRight = 'openLeftToRight',
  OpenRightToRight = 'openRightToRight',
  OpenLeftToLeft = 'openLeftToLeft',
  OpenRightToLeft = 'openRightToLeft',
  Sweethearts = 'sweethearts'
}

export enum RoleType {
  Admin = 'admin',
  User = 'user'
}

export enum Table {
  AppUser = 'app_user',
  DanceMove = 'dance_move',
  DanceSequence = 'dance_sequence',
  Event = 'event',
  KnexMigrations = 'knex_migrations',
  KnexMigrationsLock = 'knex_migrations_lock',
  MoveOfSequence = 'move_of_sequence',
  Rating = 'rating',
  RefreshToken = 'refresh_token'
}

export type Tables = {
  app_user: AppUser;
  dance_move: DanceMove;
  dance_sequence: DanceSequence;
  event: Event;
  knex_migrations: KnexMigrations;
  knex_migrations_lock: KnexMigrationsLock;
  move_of_sequence: MoveOfSequence;
  rating: Rating;
  refresh_token: RefreshToken;
};

export type AppUser = {
  id: number;
  username: string;
  password: string;
  role: RoleType;
  deleted: boolean;
};

export type DanceMove = {
  id: number;
  name: string;
  description: string | null;
  difficulty: DifficultyEnum;
  start_position: KeyPositionEnum;
  end_position: KeyPositionEnum;
  parent_move_id: number | null;
};

export type DanceSequence = {
  id: number;
  user_id: number;
  event_id: number | null;
  name: string;
  description: string | null;
};

export type Event = {
  id: number;
  name: string;
  location: string | null;
  date: Date | null;
};

export type KnexMigrations = {
  id: number;
  name: string | null;
  batch: number | null;
  migration_time: Date | null;
};

export type KnexMigrationsLock = {
  index: number;
  is_locked: number | null;
};

export type MoveOfSequence = {
  id: number;
  sequence_id: number;
  move_id: number;
  order_index: number;
};

export type Rating = {
  sequence_id: number;
  user_id: number;
  score: number | null;
};

export type RefreshToken = {
  id: number;
  user_id: number;
  token: string;
  created_at: Date | null;
  expires_at: Date;
};
