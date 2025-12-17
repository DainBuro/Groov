import api from '../services/api';
import { DanceMove, DanceMoveFormData, DifficultyEnum } from '../types';

const CONTROLLER_NAME = 'dance-moves';

export const getAllDanceMoves = async (search?: string): Promise<DanceMove[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const response = await api.get<DanceMove[]>(`/${CONTROLLER_NAME}?${params.toString()}`);
  return response.data;
};

export const getDanceMoveById = async (id: number): Promise<DanceMove> => {
  const response = await api.get<DanceMove>(`/${CONTROLLER_NAME}/${id}`);
  return response.data;
};

export const getDanceMovesByDifficulty = async (difficulty: DifficultyEnum): Promise<DanceMove[]> => {
  const response = await api.get<DanceMove[]>(`/${CONTROLLER_NAME}/difficulty/${difficulty}`);
  return response.data;
};

export const getChildMoves = async (parentId: number): Promise<DanceMove[]> => {
  const response = await api.get<DanceMove[]>(`/${CONTROLLER_NAME}/${parentId}/children`);
  return response.data;
};

export const getParentMove = async (childId: number): Promise<DanceMove | null> => {
  const response = await api.get<DanceMove | null>(`/${CONTROLLER_NAME}/${childId}/parent`);
  return response.data;
};

export const createDanceMove = async (data: DanceMoveFormData): Promise<DanceMove> => {
  const response = await api.post<DanceMove>(`/${CONTROLLER_NAME}`, data);
  return response.data;
};

export const updateDanceMove = async (id: number, data: Partial<DanceMoveFormData>): Promise<DanceMove> => {
  const response = await api.put<DanceMove>(`/${CONTROLLER_NAME}/${id}`, data);
  return response.data;
};

export const deleteDanceMove = async (id: number): Promise<void> => {
  await api.delete(`/${CONTROLLER_NAME}/${id}`);
};
