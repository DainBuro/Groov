// Enums matching backend
export enum DifficultyEnum {
  Easy = "easy",
  Medium = "medium",
  Hard = "hard",
  VeryHard = "very_hard",
}

export enum KeyPositionEnum {
  Closed = "closed",
  OpenLeftToRight = "openLeftToRight",
  OpenRightToRight = "openRightToRight",
  OpenLeftToLeft = "openLeftToLeft",
  OpenRightToLeft = "openRightToLeft",
  Sweethearts = "sweethearts",
}

export enum RoleType {
  Admin = "admin",
  User = "user",
}

// User types
export interface User {
  id: number;
  username: string;
  role: RoleType;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Dance Move types
export interface DanceMove {
  id: number;
  name: string;
  description: string | null;
  difficulty: DifficultyEnum;
  start_position: KeyPositionEnum;
  end_position: KeyPositionEnum;
  parent_move_id: number | null;
}

export interface DanceMoveFormData {
  name: string;
  description?: string;
  difficulty: DifficultyEnum;
  start_position: KeyPositionEnum;
  end_position: KeyPositionEnum;
  parent_move_id?: number;
}

// Dance Sequence types
export interface DanceSequence {
  id: number;
  user_id: number;
  creator_username?: string;
  event_id: number | null;
  name: string;
  description: string | null;
}

export interface DanceSequenceFormData {
  name: string;
  description?: string;
  event_id?: number;
}

// Event types
export interface Event {
  id: number;
  name: string;
  location: string | null;
  date: Date | null;
}

export interface EventFormData {
  name: string;
  location?: string;
  date?: Date;
}

// Move of Sequence types
export interface MoveOfSequence {
  id: number;
  name: string;
  sequence_id: number;
  move_id: number;
  order_index: number;
  move?: DanceMove;
}

// API Response types
export interface ApiError {
  message: string;
  statusCode?: number;
}
