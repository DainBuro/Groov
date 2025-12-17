import api from '../services/api';
import { LoginRequest, SignupRequest, User } from '../types';

const CONTROLLER_NAME = 'auth';

export const signup = async (data: SignupRequest): Promise<void> => {
  await api.post(`/${CONTROLLER_NAME}/signup`, data);
};

export const login = async (data: LoginRequest): Promise<void> => {
  await api.post(`/${CONTROLLER_NAME}/login`, data);
};

export const logout = async (): Promise<void> => {
  await api.post(`/${CONTROLLER_NAME}/logout`);
};

export const refreshToken = async (): Promise<void> => {
  await api.post(`/${CONTROLLER_NAME}/refresh`);
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get<User>(`/${CONTROLLER_NAME}/me`);
    return response.data;
  } catch (error) {
    return null;
  }
};
