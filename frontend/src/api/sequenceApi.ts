import api from '../services/api';
import { DanceSequence, DanceSequenceFormData, MoveOfSequence } from '../types';

const CONTROLLER_NAME = 'dance-sequences';
const SEQUENCE_MOVES_CONTROLLER = 'sequence-moves';

export const getAllSequences = async (search?: string, creatorId?: number): Promise<DanceSequence[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (creatorId) params.append('creatorId', creatorId.toString());

  const response = await api.get<DanceSequence[]>(`/${CONTROLLER_NAME}?${params.toString()}`);
  return response.data;
};

export const getMySequences = async (search?: string): Promise<DanceSequence[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const response = await api.get<DanceSequence[]>(`/${CONTROLLER_NAME}/my?${params.toString()}`);
  return response.data;
};

export const getSequenceById = async (id: number): Promise<DanceSequence> => {
  const response = await api.get<DanceSequence>(`/${CONTROLLER_NAME}/${id}`);
  return response.data;
};

export const createSequence = async (data: DanceSequenceFormData): Promise<DanceSequence> => {
  const response = await api.post<DanceSequence>(`/${CONTROLLER_NAME}`, data);
  return response.data;
};

export const updateSequence = async (id: number, data: Partial<DanceSequenceFormData>): Promise<DanceSequence> => {
  const response = await api.put<DanceSequence>(`/${CONTROLLER_NAME}/${id}`, data);
  return response.data;
};

export const deleteSequence = async (id: number): Promise<void> => {
  await api.delete(`/${CONTROLLER_NAME}/${id}`);
};

// Sequence moves management
export const getSequenceMoves = async (sequenceId: number): Promise<MoveOfSequence[]> => {
  const response = await api.get<MoveOfSequence[]>(`/${SEQUENCE_MOVES_CONTROLLER}/${sequenceId}`);
  return response.data;
};

export const replaceSequenceMoves = async (sequenceId: number, moveIds: number[]): Promise<MoveOfSequence[]> => {
  const response = await api.put<MoveOfSequence[]>(`/${SEQUENCE_MOVES_CONTROLLER}/${sequenceId}`, { moveIds });
  return response.data;
};

export const deleteSequenceMoves = async (sequenceId: number): Promise<void> => {
  await api.delete(`/${SEQUENCE_MOVES_CONTROLLER}/${sequenceId}`);
};
