import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Crown,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import type {
  AdminUsersPage,
  OnlineUsersResponse,
  OverviewResponse,
  User,
  UserTier,
} from '@sahay/types';

import { TierBadge } from '@/components/TierBadge';
import {
  AdminApiError,
  fetchOnlineUsers,
  fetchOverview,
  fetchUsers,
  updateUserTier,
} from '@/lib/adminApi';

import { StageBarChart } from './charts/StageBarChart';
import { GameActivityChart } from './charts/GameActivityChart';

interface AdminDashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
}

const STAGE_COLORS = ['#27AE60', '#2ECC71', '#5DA600', '#E67E22', '#E67E22', '#E67E22', '#E67E22'];

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function AdminDashboard({ user, token, onLogout }: AdminDashboardProps) {
  const [online, setOnline] = useState<OnlineUsersResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [usersPage, setUsersPage] = useState<AdminUsersPage | null>(null);
  const [page, setPage] = useState(1);
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOnline = useCallback(async () => {
    try {
      const data = await fetchOnlineUsers(token);
      setOnline(data);
    } catch {
      // Transient — keep the last known value rather than flashing an error.
    }
  }, [token]);

  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchOverview(token);
      setOverview(data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load analytics');
    }
  }, [token]);

  const loadUsers = useCallback(
    async (target: number) => {
      try {
        const data = await fetchUsers(token, target);
        setUsersPage(data);
      } catch (err) {
        setError(err instanceof AdminApiError ? err.message : 'Failed to load users');
      }
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadOnline(), loadOverview(), loadUsers(page)]);
      if (!cancelled) {
        setLoading(false);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadOnline, loadOverview, loadUsers, page]);

  // Live online-users pulse: refresh every 15s.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadOnline();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadOnline]);

  const handleTierChange = async (userId: string, nextTier: UserTier) => {
    setBusyTier(userId);
    try {
      await updateUserTier(token, userId, { tier: nextTier });
      await Promise.all([loadUsers(page), loadOverview(), loadOnline()]);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to update tier');
    } finally {
      setBusyTier(null);
    }
  };

  if (loading && !overview && !usersPage) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F0] items-center justify-center">
        <p className="text-[#2C3E50] text-lg">Loading admin console…</p>
      </div>
    );
  }

  const safeOverview = overview;
  const totalUsers = safeOverview?.total_users ?? usersPage?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#F8F6F0] p-4 sm:p-6 md:p-10 animate-fade-in">
      {/* Navigation bar */}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2C3E50] bg-[#FFFCF6] px-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-[#2C3E50]">
          <ShieldCheck size={22} className="text-[#E67E22]" />
          <span className="font-bold text-lg">Sahāy Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-[#2C3E50]/80">{user.full_name}</span>
          <TierBadge tier={user.tier} />
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border-2 border-[#2C3E50] bg-[#F8F6F0] px-3 py-1.5 text-sm font-semibold text-[#2C3E50] hover:bg-[#edeae3] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      <header className="mt-6 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2C3E50]">Admin Console</h1>
        <p className="text-[#2C3E50]/80 text-base mt-1">
          Live platform telemetry, user management, and cognitive analytics.
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded-xl border-2 border-[#E67E22] bg-[#FFF6EA] px-4 py-3 text-sm text-[#b3452c] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              void loadOverview();
              void loadUsers(page);
            }}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* ─── Top Metrics Row ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-up">
        <MetricCard
          label="Online Now"
          value={online?.online_users ?? 0}
          icon={<Activity size={24} />}
          accent
          pulse={Boolean(online && online.online_users > 0)}
          subtitle="Active in last 5 min"
        />
        <MetricCard
          label="Total Patients"
          value={safeOverview?.total_patients ?? 0}
          icon={<Users size={24} />}
          subtitle="Registered patients"
        />
        <MetricCard
          label="Total Caretakers"
          value={safeOverview?.total_caretakers ?? 0}
          icon={<UsersRound size={24} />}
          subtitle="Caretaker accounts"
        />
        <MetricCard
          label="Premium Conversion"
          value={`${safeOverview?.premium_conversion_rate_pct ?? 0}%`}
          icon={<Crown size={24} />}
          accent
          subtitle={`${safeOverview?.premium_user_count ?? 0} of ${totalUsers} users`}
        />
      </section>

      {/* ─── Charts + Usage Summary ────────────────────────────────── */}
      {safeOverview ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fade-up">
          <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 text-[#2C3E50] mb-4">
              <BarChart3 size={22} />
              <h2 className="text-lg font-bold">Patient Stage Distribution</h2>
            </div>
            <StageBarChart distribution={safeOverview.stage_distribution} colors={STAGE_COLORS} />
          </div>
          <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 text-[#2C3E50] mb-4">
              <Activity size={22} />
              <h2 className="text-lg font-bold">Game Activity Breakdown</h2>
            </div>
            <GameActivityChart data={safeOverview.game_activity_breakdown} />
          </div>
          <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
            <div className="flex items-center gap-2 text-[#2C3E50] mb-4">
              <RefreshCw size={22} />
              <h2 className="text-lg font-bold">Usage Summary</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <Stat label="Total Sessions" value={safeOverview.total_sessions} />
              <Stat label="Screen Time" value={formatDuration(safeOverview.total_screen_time_seconds)} />
              <Stat label="Avg Session" value={formatDuration(safeOverview.average_session_length_seconds)} />
              <Stat
                label="Therapy Stages"
                value={Object.values(safeOverview.stage_distribution).filter((c) => c > 0).length}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── User Management Table ──────────────────────────────────── */}
      <section className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-4 sm:p-6 shadow-md animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#2C3E50]">
            <Users size={22} />
            <h2 className="text-lg font-bold">User Management</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers(page)}
            className="p-2 rounded-lg border-2 border-[#2C3E50] text-[#2C3E50] hover:bg-[#edeae3] transition-colors"
            aria-label="Refresh users"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#2C3E50] text-[#2C3E50]">
                <th className="text-left p-2 font-semibold">Name</th>
                <th className="text-left p-2 font-semibold">Email</th>
                <th className="text-left p-2 font-semibold">Role</th>
                <th className="text-left p-2 font-semibold">Tier</th>
                <th className="text-left p-2 font-semibold">Last Active</th>
                <th className="text-left p-2 font-semibold">Tier Control</th>
              </tr>
            </thead>
            <tbody>
              {(usersPage?.items ?? []).map((row) => (
                <tr key={row.id} className="border-b border-[#2C3E50]/20 hover:bg-[#F8F6F0] transition-colors">
                  <td className="p-2 font-medium text-[#2C3E50]">{row.full_name}</td>
                  <td className="p-2 text-[#2C3E50]/80 break-all">{row.email}</td>
                  <td className="p-2 text-[#2C3E50]">{row.role}</td>
                  <td className="p-2">
                    <TierBadge tier={row.tier} />
                  </td>
                  <td className="p-2 text-[#2C3E50]/70">
                    {row.last_active_at ? new Date(row.last_active_at).toLocaleString() : '—'}
                  </td>
                  <td className="p-2">
                    <TierToggle
                      userId={row.id}
                      value={row.tier}
                      disabled={busyTier === row.id}
                      onChange={(next) => void handleTierChange(row.id, next)}
                    />
                  </td>
                </tr>
              ))}
              {usersPage && usersPage.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#2C3E50]/60">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {usersPage && usersPage.pages > 1 ? (
          <div className="flex items-center justify-between mt-4 text-sm text-[#2C3E50]">
            <span>
              Page {usersPage.page} of {usersPage.pages} · {usersPage.total} users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border-2 border-[#2C3E50] disabled:opacity-40 hover:bg-[#edeae3] transition-colors"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= usersPage.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border-2 border-[#2C3E50] disabled:opacity-40 hover:bg-[#edeae3] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent = false,
  pulse = false,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
  pulse?: boolean;
  subtitle?: string;
}) {
  const accentClass = accent ? 'text-[#E67E22]' : 'text-[#2C3E50]';
  return (
    <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#2C3E50]/70">
          {label}
        </span>
        {icon ? <span className={accentClass}>{icon}</span> : null}
      </div>
      <div className={`text-2xl sm:text-3xl font-extrabold ${accentClass} flex items-center gap-2`}>
        {pulse ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E67E22] opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E67E22]" />
          </span>
        ) : null}
        {value}
      </div>
      {subtitle ? <div className="text-xs text-[#2C3E50]/60 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xl sm:text-2xl font-bold text-[#E67E22]">{value}</div>
      <div className="text-xs text-[#2C3E50]/70 mt-1">{label}</div>
    </div>
  );
}

function TierToggle({
  userId,
  value,
  disabled,
  onChange,
}: {
  userId: string;
  value: UserTier;
  disabled: boolean;
  onChange: (next: UserTier) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border-2 border-[#2C3E50] overflow-hidden">
      {(['FREE', 'PREMIUM'] as UserTier[]).map((tier) => {
        const active = tier === value;
        return (
          <button
            key={userId + tier}
            type="button"
            disabled={disabled || active}
            onClick={() => onChange(tier)}
            className={`px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
              active
                ? tier === 'PREMIUM'
                  ? 'bg-[#C4A35A] text-white'
                  : 'bg-[#2C3E50] text-[#FFFCF6]'
                : 'bg-[#F8F6F0] text-[#2C3E50] hover:bg-[#edeae3]'
            }`}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}


