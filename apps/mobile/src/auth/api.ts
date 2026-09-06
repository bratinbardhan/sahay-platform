import type { AuthResponse, LoginRequest, SignupRequest, User } from '@sahay/types';

import { API_BASE_URL } from '@/config/apiConfig';

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

async function postJson<TResponse>(
  url: string,
  body: unknown,
  token?: string
): Promise<TResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
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
      // keep raw text as the message
    }
    throw new AuthApiError(detail, response.status);
  }
  return JSON.parse(raw) as TResponse;
}

/** POST /api/v1/auth/login */
export function apiLogin(payload: LoginRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>(`${AUTH_BASE_URL}/login`, payload);
}

/** POST /api/v1/auth/signup */
export function apiSignup(payload: SignupRequest): Promise<AuthResponse> {
  return postJson<AuthResponse>(`${AUTH_BASE_URL}/signup`, payload);
}

/** GET /api/v1/auth/me — validates a stored token and refreshes the profile. */
export function apiFetchMe(token: string): Promise<User> {
  return getJson<User>(`${AUTH_BASE_URL}/me`, token);
}