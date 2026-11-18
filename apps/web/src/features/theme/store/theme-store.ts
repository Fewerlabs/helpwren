import { create } from "zustand";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const useThemeStore = create<ThemeState>()((set) => ({
  theme: "light",
  setTheme: (theme) => {
    set({ theme });
  },
}));

export const useTheme = () => useThemeStore((state) => state.theme);
export const useSetTheme = () => useThemeStore((state) => state.setTheme);
