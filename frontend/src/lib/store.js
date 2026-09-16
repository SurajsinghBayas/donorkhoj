import { create } from 'zustand';

export const useAppStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  chatOpen: false,

  setUser: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, chatOpen: false });
  },

  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}));

/** Where each role lands after login */
export function homeFor(role) {
  switch (role) {
    case 'donor': return '/donor';
    case 'recipient': return '/recipient';
    case 'doctor': return '/doctor';
    case 'admin': return '/admin';
    default: return '/login';
  }
}
