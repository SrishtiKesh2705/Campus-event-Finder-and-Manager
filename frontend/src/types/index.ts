export type UserRole = "admin" | "user" | "student";

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface EventItem {
  _id: string;
  title: string;
  description: string;
  type: "hackathon" | "tech" | "seminar" | "games" | "movie" | "other";
  date: string;
  time: string;
  registrationDeadline: string;
  location: string;
  createdBy?: string;
  maxRegistrations?: number;
  registrationCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistrationItem {
  _id: string;
  userId:
    | string
    | {
        _id: string;
        name: string;
        email: string;
      };
  eventId: string | EventItem;
  registeredAt: string;
}

export interface ApiMessage {
  msg: string;
}
