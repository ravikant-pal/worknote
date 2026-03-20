import { create } from 'zustand';

const useThemeStore = create((set) => ({
  mode: localStorage.getItem('worknote-theme') ?? 'light',

  toggleMode: () =>
    set((s) => {
      const next = s.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('worknote-theme', next);
      return { mode: next };
    }),
}));

export default useThemeStore;
