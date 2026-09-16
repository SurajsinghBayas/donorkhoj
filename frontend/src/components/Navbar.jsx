import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { Heart, Activity, User, LogOut, MessageSquareCode, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { user, logout, toggleChatbot, chatbotOpen } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'donor': return <span className="badge badge-emerald">🫀 Donor</span>;
      case 'recipient': return <span className="badge badge-rose">🩸 Recipient</span>;
      case 'doctor': return <span className="badge badge-cyan">🩺 Doctor</span>;
      case 'admin': return <span className="badge badge-amber">🛡️ Admin</span>;
      default: return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#090d16]/80 border-b border-white/10 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
        </div>
        <div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
            DonorKhoj
          </span>
          <span className="block text-[10px] text-cyan-400/80 font-mono tracking-wider uppercase">
            AI Organ Match • NOTTO Compliant
          </span>
        </div>
      </Link>

      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-gray-200">{user.full_name || user.username}</span>
            {getRoleBadge(user.role)}
          </div>

          <button
            onClick={toggleChatbot}
            className={`btn-secondary text-sm ${chatbotOpen ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : ''}`}
            title="Ask DonorBot AI"
          >
            <MessageSquareCode className="w-4 h-4 text-cyan-400" />
            <span>DonorBot AI</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
