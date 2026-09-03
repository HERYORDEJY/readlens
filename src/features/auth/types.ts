export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  slug: string;
  status: string;
  is_verified: boolean;
  description: string | null;
  favourite_genres: string[];
  photo: { url?: string } | Record<string, never>;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginData {
  token: string;
  email: string;
  message: string;
}

export interface VerifyOtpRequest {
  otp: string;
  email: string;
  token: string;
}


export interface VerifyOtpData {
  message: string;
  user: User;
  access_token: string;
}
