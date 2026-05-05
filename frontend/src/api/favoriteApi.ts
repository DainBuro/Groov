import api from '../services/api';

const CONTROLLER_NAME = 'favorites';

export const getFavoriteMoveIds = async (): Promise<number[]> => {
  const response = await api.get<number[]>(`/${CONTROLLER_NAME}`);
  return response.data;
};

export const addFavoriteMove = async (moveId: number): Promise<void> => {
  await api.post(`/${CONTROLLER_NAME}/${moveId}`);
};

export const removeFavoriteMove = async (moveId: number): Promise<void> => {
  await api.delete(`/${CONTROLLER_NAME}/${moveId}`);
};
