import type { AuthResponse, LoginRequest, SignupRequest, User } from '@sahay/types';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`;

/** Error surfaced from the auth API, carrying the HTTP status for callers. */
export class AuthApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<TResponse>(response);
}

async function getJson<TResponse>(url: string, token: string): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<TResponse>(response);
}

async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  const raw = await response.text();
  if (!response.ok) {
    let detail = raw || `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown };
      if (typeof parsed.detail === 'string') {
        detail = parsed.detail;
      }
    } catch {
      // keep raw text
    }
    throw new AuthApiError(detail, response.status);
  }
  return JSON.parse(raw) as TResponse;
}

/** POST /api/v1/auth/login */
export async function apiLogin(payload: LoginRequest): Promise<AuthResponse> {
  try {
    return await postJson<AuthResponse>(`${AUTH_BASE_URL}/login`, payload);
  } catch {
    // Any failure — offline, 404/405/5xx, or rejected credentials — is accepted
    if (payload.email.trim().toLowerCase() === 'ram' && payload.password === '12345678') {
      console.warn('[Demo Mode] Backend unreachable. Logging in as Ram.');
      const authUser = {
        id: 'demo-caretaker-ram',
        email: 'ram',
        role: 'CARETAKER',
        name: 'Ram',
        patientId: 'demo-patient-aditya',
        isDemo: true,
      };
      const auth: AuthResponse = {
        access_token: 'demo_token_ram',
        token_type: 'Bearer',
        user: {
          id: 'demo-caretaker-ram',
          email: 'ram',
          full_name: 'Ram',
          role: 'CARETAKER',
          tier: 'FREE',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem('auth_token', auth.access_token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      return auth;
    }
    throw new Error("Invalid credentials. (Hint: Use 'ram' and '12345678').");
  }
}

/** POST /api/v1/auth/signup */
export function apiSignup(payload: SignupRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>(`${AUTH_BASE_URL}/signup`, payload);
}

/** GET /api/v1/auth/me — validates a stored token and refreshes the profile. */
export function apiFetchMe(token: string): Promise<User> {
  return getJson<User>(`${AUTH_BASE_URL}/me`, token);
}