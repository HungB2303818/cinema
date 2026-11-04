export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'LOCKED';
}

export interface AuthResponse {
  token: string;
  tokenType?: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
}
