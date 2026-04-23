import api from "./api";
import type { ApiMessage, RegistrationItem } from "../types";

export interface RegistrationPayload {
  name: string;
  collegeId: string;
  collegeName: string;
  email: string;
}

export async function registerForEvent(eventId: string, payload?: RegistrationPayload) {
  const { data } = await api.post<ApiMessage>(`/registrations/${eventId}`, payload ?? {});
  return data;
}

export async function getMyRegistrations() {
  const { data } = await api.get<RegistrationItem[]>("/my-registrations");
  return data;
}

export async function getEventRegistrations(eventId: string) {
  const { data } = await api.get<RegistrationItem[]>(
    `/event/${eventId}/registrations`,
  );
  return data;
}
