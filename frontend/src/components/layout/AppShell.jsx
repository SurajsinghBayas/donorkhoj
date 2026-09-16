import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutGrid, ClipboardCheck, Search, HeartHandshake,
  Inbox, BarChart3, LogOut, MessageSquare, Menu, X,
  User as UserIcon, Building2, BookOpen,
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { ROLE_LABELS } from '../../lib/constants';
import { initials } from '../../lib/format';
import Logo from '../ui/Logo';
import Badge from '../ui/Badge';
import ChatDrawer from '../chat/ChatDrawer';

const SHARED_NAV = [
  { to: '/hospitals', label: 'Hospitals', icon: Building2 },
  { to: '/guide', label: 'Transplant guide', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

const NAV = {
  donor: [
    { to: '/donor', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/donor/screening', label: 'Medical screening', icon: ClipboardCheck },
    { to: '/donor/matches', label: 'My matches', icon: HeartHandshake },
    ...SHARED_NAV,
  ],
  recipient: [
    { to: '/recipient', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/recipient/find', label: 'Find donors', icon: Search },
    { to: '/recipient/screening', label: 'Medical screening', icon: ClipboardCheck },
    { to: '/recipient/matches', label: 'My matches', icon: HeartHandshake },
    ...SHARED_NAV,
  ],
  doctor: [
    { to: '/doctor', label: 'Review queue', icon: Inbox, end: true },
    ...SHARED_NAV,
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
    ...SHARED_NAV,
  ],
};

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 h-9 px-3 rounded-md text-[13.5px] font-medium transition-colors ${
              isActive
                ? 'bg-ink text-white'
                : 'text-stone-500 hover:text-ink hover:bg-stone-100'
            }`
          }
        >
          <Icon size={16} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard({ user, onLogout }) {
  return (
    <div className="border-t border-stone-200 p-3">
      <div className="flex items-center gap-2.5 px-1.5 py-1.5">
        <span className="w-8 h-8 rounded-md bg-blood-50 border border-blood-100 text-blood-700 flex items-center justify-center text-[12px] font-semibold shrink-0">
          {initials(user.full_name || user.username)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink truncate leading-tight">
            {(user.full_name || user.username || '').replace(/\s*\(.*?\)\s*/g, '')}
          </p>
          <p className="micro mt-0.5" style={{ fontSize: 10 }}>
            {ROLE_LABELS[user.role]}{user.city ? ` · ${user.city}` : ''}
          </p>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="p-1.5 rounded-md text-stone-400 hover:text-blood-600 hover:bg-blood-50 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, logout, toggleChat } = useAppStore();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const items = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-stone-200 z-30">
        <div className="h-16 flex items-center px-5 border-b border-stone-200">
          <Logo size={26} />
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <p className="micro px-6 mb-2" style={{ fontSize: 10 }}>Menu</p>
          <NavItems items={items} />
        </div>
        <UserCard user={user} onLogout={handleLogout} />
      </aside>

      {/* ── Sidebar (mobile overlay) ── */}
      {mobileNav && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-stone-200 flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-stone-200">
              <Logo size={26} />
              <button onClick={() => setMobileNav(false)} className="p-1 text-stone-400 hover:text-ink cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavItems items={items} onNavigate={() => setMobileNav(false)} />
            </div>
            <UserCard user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="md:pl-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-16 bg-paper/85 backdrop-blur border-b border-stone-200 flex items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="md:hidden p-2 -ml-2 rounded-md text-stone-500 hover:bg-stone-100 cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <Badge tone="stone" className="hidden sm:inline-flex">
              {ROLE_LABELS[user?.role]} portal
            </Badge>
          </div>
          <button
            onClick={toggleChat}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md border border-stone-300 bg-white
              text-[13px] font-medium text-ink hover:border-stone-400 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <MessageSquare size={15} className="text-blood-600" />
            Ask DonorBot
            <kbd className="hidden sm:inline font-mono text-[10px] text-stone-400 border border-stone-200 rounded px-1 py-0.5 bg-stone-50">
              AI
            </kbd>
          </button>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t border-stone-200 px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-2">
          <p className="micro" style={{ fontSize: 10 }}>
            DonorKhoj · Aligned with NOTTO guidelines & THO Act 2011 · Not a substitute for clinical judgement
          </p>
          <Link to="/how-it-works" className="micro hover:text-ink transition-colors" style={{ fontSize: 10 }}>
            How the ML & agents work →
          </Link>
        </footer>
      </div>

      <ChatDrawer />
    </div>
  );
}
