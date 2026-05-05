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
  Any = "any",
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

export enum PoseStatusEnum {
  Queued = "queued",
  Processing = "processing",
  Ready = "ready",
  Failed = "failed",
}

export enum SubmissionStatusEnum {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export interface DanceMove {
  id: number;
  name: string;
  description: string | null;
  difficulty: DifficultyEnum;
  start_position: KeyPositionEnum;
  end_position: KeyPositionEnum;
  parent_move_id: number | null;
  pose_data?: string | null;
  pose_file_name?: string | null;
  pose_status?: PoseStatusEnum | null;
  pose_error?: string | null;
  has_pose_data?: boolean;
  youtube_url?: string | null;
  submission_status?: SubmissionStatusEnum;
  created_by?: number | null;
  creator_username?: string | null;
  rejection_reason?: string | null;
}

// Pose data types (MediaPipe output)
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
}

export interface PoseData {
  fps: number;
  num_poses: number;
  frames: PoseLandmark[][][]; // frames[frameIndex][poseIndex][landmarkIndex]
}

export interface DanceMoveFormData {
  name: string;
  description?: string;
  difficulty: DifficultyEnum;
  start_position: KeyPositionEnum;
  end_position: KeyPositionEnum;
  parent_move_id?: number;
  youtube_url?: string | null;
}

// Dance Sequence types
export interface DanceSequence {
  id: number;
  user_id: number;
  creator_username?: string;
  event_id: number | null;
  name: string;
  description: string | null;
  youtube_url?: string | null;
}

export interface DanceSequenceFormData {
  name: string;
  description?: string;
  event_id?: number;
  youtube_url?: string | null;
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
