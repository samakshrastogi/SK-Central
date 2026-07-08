import { create } from 'zustand';

interface UiState {
  commandOpen: boolean;
  assistantOpen: boolean;
  notificationsOpen: boolean;
  darkMode: boolean;
  setCommandOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  assistantOpen: false,
  notificationsOpen: false,
  darkMode: true,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  toggleTheme: () => set((state) => ({ darkMode: !state.darkMode }))
}));
