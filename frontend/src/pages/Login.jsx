import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../api';
import { Heart, Stethoscope, User, Shield, Lock, Mail, UserCheck, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('donor');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    city: 'Mumbai',
  });
  const [loading, setLoading] = useState(false);

  const { setUser } = useAppStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await api.post('/auth/register', { ...formData, role });
        toast.success('Account created! Logging in...');
      }

      const params = new URLSearchParams();
      params.append('username', formData.username);
      params.append('password', formData.password);

      const res = await api.post('/auth/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, user } = res.data;
      setUser(user, access_token);
      toast.success(`Welcome back, ${user.full_name || user.username}!`);

      // Redirect based on role
      switch (user.role) {
        case 'donor': navigate('/donor-dashboard'); break;
        case 'recipient': navigate('/recipient-dashboard'); break;
        case 'doctor': navigate('/doctor-dashboard'); break;
        case 'admin': navigate('/admin-dashboard'); break;
        default: navigate('/donor-dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-8 space-y-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        {/* Glowing backdrop accent */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Heart className="w-8 h-8 text-white fill-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {isRegister ? 'Create New Account' : 'DonorKhoj Login'}
          </h2>
          <p className="text-xs text-gray-400">
            {isRegister ? 'Join India’s premier AI organ matching platform' : 'Access your role-based portal'}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-300 block">Select Role:</label>
          <div className="grid grid-cols-4 gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
            {[
              { id: 'donor', label: 'Donor', icon: Heart },
              { id: 'recipient', label: 'Recipient', icon: User },
              { id: 'doctor', label: 'Doctor', icon: Stethoscope },
              { id: 'admin', label: 'Admin', icon: Shield },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                  role === r.id
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <r.icon className="w-4 h-4" />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Dr. Rajesh Sharma / Amit Patel"
                    className="glass-input pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="glass-input pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">City (India)</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Mumbai, Delhi, Bangalore..."
                  className="glass-input text-xs"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email / Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username or email"
                className="glass-input pl-9 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="glass-input pl-9 text-xs"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-xs font-semibold justify-center shadow-lg shadow-cyan-500/20"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Login'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle between Register & Login */}
        <div className="text-center pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-cyan-400 hover:underline font-semibold"
          >
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
          <span className="text-gray-500 cursor-pointer hover:text-gray-400">Forgot Password?</span>
        </div>
      </div>
    </div>
  );
}
