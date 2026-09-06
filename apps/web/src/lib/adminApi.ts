import type {
  AdminUser,
  AdminUsersPage,
  HeartbeatResponse,
  OnlineUsersResponse,
  OverviewResponse,
  TierUpdateRequest,
} from '@sahay/types';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

const ADMIN_BASE_URL = `${API_BASE_URL}/api/v1/admin`;

/** Error surfaced from the admin API, carrying the HTTP status for callers. */
export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

async function adminRequest<TResponse>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const parsed = (await response.json()) as { detail?: unknown };
      if (typeof parsed.detail === 'string') {
        detail = parsed.detail;
      }
    } catch {
      // keep default detail
    }
    throw new AdminApiError(detail, response.status);
  }
  return (await response.json()) as TResponse;
}

/** GET /api/v1/admin/analytics/online-users */
export function fetchOnlineUsers(token: string): Promise<OnlineUsersResponse> {
  return adminRequest<OnlineUsersResponse>('/analytics/online-users', token);
}

/** GET /api/v1/admin/users?page=&size= */
export function fetchUsers(
  token: string,
  page = 1,
  size = 20,
): Promise<AdminUsersPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return adminRequest<AdminUsersPage>(`/users?${params.toString()}`, token);
}

/** PATCH /api/v1/admin/users/{user_id}/tier */
export function updateUserTier(
  token: string,
  userId: string,
  payload: TierUpdateRequest,
): Promise<AdminUser> {
  return adminRequest<AdminUser>(`/users/${userId}/tier`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/admin/analytics/overview */
export function fetchOverview(token: string): Promise<OverviewResponse> {
  return adminRequest<OverviewResponse>('/analytics/overview', token);
}

/** POST /api/v1/telemetry/heartbeat */
export async function sendHeartbeat(token: string): Promise<HeartbeatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let detail = `Heartbeat failed with status ${response.status}`;
    try {
      const parsed = (await response.json()) as { detail?: unknown };
      if (typeof parsed.detail === 'string') {
        detail = parsed.detail;
      }
    } catch {
      // keep default detail
    }
    throw new AdminApiError(detail, response.status);
  }
  return (await response.json()) as HeartbeatResponse;
}
