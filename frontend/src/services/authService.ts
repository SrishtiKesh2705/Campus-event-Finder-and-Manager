import api from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user" | "student";
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<{ token: string }>("/auth/login", payload);
  return data;
}

export async function signup(payload: SignupPayload) {
  const { data } = await api.post<{ msg: string }>("/auth/register", payload);
  return data;
}
