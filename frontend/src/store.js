import { create } from 'zustand';

export const useAppStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  activePipelineJob: null,
  chatbotOpen: false,

  setUser: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  setActivePipelineJob: (jobId) => set({ activePipelineJob: jobId }),
  setChatbotOpen: (open) => set({ chatbotOpen: open }),
  toggleChatbot: () => set((state) => ({ chatbotOpen: !state.chatbotOpen })),
}));
