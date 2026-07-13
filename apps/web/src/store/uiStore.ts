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
  setCommandOpen: (commandOpen) => set(commandOpen ? { commandOpen: true, assistantOpen: false, notificationsOpen: false } : { commandOpen: false }),
  setAssistantOpen: (assistantOpen) => set(assistantOpen ? { assistantOpen: true, commandOpen: false, notificationsOpen: false } : { assistantOpen: false }),
  setNotificationsOpen: (notificationsOpen) => set(notificationsOpen ? { notificationsOpen: true, commandOpen: false, assistantOpen: false } : { notificationsOpen: false }),
  toggleTheme: () => set((state) => ({ darkMode: !state.darkMode }))
}));
