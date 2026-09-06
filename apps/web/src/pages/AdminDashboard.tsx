import { LogOut, ShieldCheck, Users } from 'lucide-react';
import type { User } from '@sahay/types';

import { TierBadge } from '@/components/TierBadge';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

/** Admin landing page — Phase 2 grows this into the full platform console. */
export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-[#F8F6F0] p-6 md:p-10">
      {/* Navigation bar */}
      <nav className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2C3E50] bg-[#FFFCF6] px-4 py-3 rounded-xl">
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

      <header className="mt-8">
        <h1 className="text-4xl font-bold text-[#2C3E50]">Admin Console</h1>
        <p className="text-[#2C3E50]/80 text-lg mt-1">
          Welcome back, {user.full_name} — user roles and premium tiers are live.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6">
          <div className="flex items-center gap-2 text-[#2C3E50]">
            <Users size={22} />
            <h2 className="text-lg font-bold">Unified Accounts</h2>
          </div>
          <p className="mt-3 text-sm text-[#2C3E50]/80">
            Phase 1 ships a single <code className="text-[#E67E22]">users</code> table with{' '}
            <code className="text-[#E67E22]">ADMIN / CARETAKER / PATIENT</code> roles and{' '}
            <code className="text-[#E67E22]">FREE / PREMIUM</code> tiers. Account management,
            invite flows and tier billing land in Phase 2.
          </p>
          <div className="mt-4 rounded-xl border-2 border-[#2C3E50] bg-[#F8F6F0] p-3">
            <dl className="grid grid-cols-2 gap-x-4 text-sm">
              <dt className="text-[#2C3E50]/70">Your role</dt>
              <dd className="text-[#2C3E50] font-semibold">{user.role}</dd>
              <dt className="text-[#2C3E50]/70">Your tier</dt>
              <dd className="text-[#2C3E50] font-semibold">{user.tier}</dd>
              <dt className="text-[#2C3E50]/70">Email</dt>
              <dd className="text-[#2C3E50] font-semibold break-all">{user.email}</dd>
              <dt className="text-[#2C3E50]/70">Account status</dt>
              <dd className="text-[#2C3E50] font-semibold">{user.is_active ? 'Active' : 'Disabled'}</dd>
            </dl>
          </div>
        </div>

        <div className="bg-[#FFFCF6] border-2 border-[#2C3E50] rounded-2xl p-6">
          <div className="flex items-center gap-2 text-[#2C3E50]">
            <ShieldCheck size={22} />
            <h2 className="text-lg font-bold">Role-Based Routing</h2>
          </div>
          <p className="mt-3 text-sm text-[#2C3E50]/80">
            After login, users are redirected by role — Admins land here at{' '}
            <code className="text-[#E67E22]">/admin</code>, caretakers land on{' '}
            <code className="text-[#E67E22]">/dashboard</code>, and the tier badge in the
            navigation bar reflects the account&apos;s subscription.
          </p>
        </div>
      </div>
    </div>
  );
}