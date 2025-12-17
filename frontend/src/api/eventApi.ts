import api from "../services/api";
import { Event, EventFormData } from "../types";

const CONTROLLER_NAME = "events";

export const getAllEvents = async (search?: string): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);

  const response = await api.get<Event[]>(
    `/${CONTROLLER_NAME}?${params.toString()}`
  );
  return response.data;
};

export const getEventById = async (id: number): Promise<Event> => {
  const response = await api.get<Event>(`/${CONTROLLER_NAME}/${id}`);
  return response.data;
};

export const createEvent = async (data: EventFormData): Promise<Event> => {
  const response = await api.post<Event>(`/${CONTROLLER_NAME}`, data);
  return response.data;
};

export const updateEvent = async (
  id: number,
  data: Partial<EventFormData>
): Promise<Event> => {
  const response = await api.put<Event>(`/${CONTROLLER_NAME}/${id}`, data);
  return response.data;
};

export const deleteEvent = async (id: number): Promise<void> => {
  await api.delete(`/${CONTROLLER_NAME}/${id}`);
};
