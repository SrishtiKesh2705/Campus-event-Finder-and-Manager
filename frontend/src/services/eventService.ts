import api from "./api";
import type { EventItem } from "../types";

export interface EventsQuery {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface EventPayload {
  title: string;
  description: string;
  type: EventItem["type"];
  date: string;
  time: string;
  registrationDeadline: string;
  location: string;
}

export async function getEvents(query: EventsQuery = {}) {
  const { data } = await api.get<EventItem[]>("/events", { params: query });
  return data;
}

export async function getEventById(id: string) {
  const { data } = await api.get<EventItem>(`/events/${id}`);
  return data;
}

export async function createEvent(payload: EventPayload) {
  const { data } = await api.post<EventItem>("/events", payload);
  return data;
}

export async function updateEvent(id: string, payload: EventPayload) {
  const { data } = await api.put<EventItem>(`/events/${id}`, payload);
  return data;
}

export async function deleteEvent(id: string) {
  const { data } = await api.delete<{ msg: string }>(`/events/${id}`);
  return data;
}
