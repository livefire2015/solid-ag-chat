import { Component, createContext, useContext, createSignal, createEffect, JSX } from 'solid-js';
import type { Theme, ThemeMode } from '../services/types';

interface ThemeContextType {
  theme: () => Theme;
  mode: () => ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDarkMode: () => boolean;
  isLightMode: () => boolean;
  isSystemMode: () => boolean;
}

const ThemeContext = createContext<ThemeContextType>();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: JSX.Element;
  initialMode?: ThemeMode;
  enableSystemPreference?: boolean;
  storageKey?: string;
  defaultTheme?: Partial<Theme>;
}

const defaultThemeConfig: Theme = {
  mode: 'light',
  colors: {
    light: {
      primary: '#3b82f6',
      secondary: '#6b7280',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6'
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#9ca3af',
      accent: '#a78bfa',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textSecondary: '#d1d5db',
      border: '#374151',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#34d399',
      info: '#60a5fa'
    }
  },
  borderRadius: '0.5rem',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem'
  }
};

const ThemeProvider: Component<ThemeProviderProps> = (props) => {
  const storageKey = props.storageKey || 'agui-chat-theme';
  const [mode, setModeSignal] = createSignal<ThemeMode>(props.initialMode || 'system');

  // Merge default theme with custom theme
  const theme = (): Theme => ({
    ...defaultThemeConfig,
    ...props.defaultTheme,
    mode: mode(),
    colors: {
      light: { ...defaultThemeConfig.colors.light, ...props.defaultTheme?.colors?.light },
      dark: { ...defaultThemeConfig.colors.dark, ...props.defaultTheme?.colors?.dark }
    }
  });

  // Load theme from storage
  const loadThemeFromStorage = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (['light', 'dark', 'system'].includes(parsed.mode)) {
          setModeSignal(parsed.mode);
        }
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
  };

  // Save theme to storage
  const saveThemeToStorage = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ mode: mode() }));
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  };

  // Get system preference
  const getSystemPreference = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Get effective mode (resolves 'system' to actual preference)
  const getEffectiveMode = (): 'light' | 'dark' => {
    const currentMode = mode();
    if (currentMode === 'system') {
      return getSystemPreference();
    }
    return currentMode;
  };

  // Apply theme to document
  const applyTheme = () => {
    if (typeof document === 'undefined') return;

    const effectiveMode = getEffectiveMode();
    const currentTheme = theme();
    const colors = currentTheme.colors[effectiveMode];

    // Apply CSS custom properties
    const root = document.documentElement;

    // Color variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Theme mode class
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveMode);

    // Additional CSS custom properties
    root.style.setProperty('--border-radius', currentTheme.borderRadius);
    root.style.setProperty('--font-family', currentTheme.fontFamily);

    Object.entries(currentTheme.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
  };

  // Set mode
  const setMode = (newMode: ThemeMode) => {
    setModeSignal(newMode);
    saveThemeToStorage();
    applyTheme();
  };

  // Toggle between light and dark (ignores system)
  const toggleMode = () => {
    const currentMode = mode();
    if (currentMode === 'system') {
      const systemPref = getSystemPreference();
      setMode(systemPref === 'dark' ? 'light' : 'dark');
    } else {
      setMode(currentMode === 'dark' ? 'light' : 'dark');
    }
  };

  // Computed values
  const isDarkMode = () => getEffectiveMode() === 'dark';
  const isLightMode = () => getEffectiveMode() === 'light';
  const isSystemMode = () => mode() === 'system';

  // Listen to system preference changes
  createEffect(() => {
    if (!props.enableSystemPreference) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode() === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  });

  // Initial setup
  createEffect(() => {
    loadThemeFromStorage();
    applyTheme();
  });

  // Apply theme when mode changes
  createEffect(() => {
    mode(); // Track mode changes
    applyTheme();
  });

  const contextValue: ThemeContextType = {
    theme,
    mode,
    setMode,
    toggleMode,
    isDarkMode,
    isLightMode,
    isSystemMode
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

// Hook for using theme colors directly
export const useThemeColors = () => {
  const { theme, isDarkMode } = useTheme();
  return () => theme().colors[isDarkMode() ? 'dark' : 'light'];
};

// Theme toggle component
export const ThemeToggle: Component<{ className?: string }> = (props) => {
  const { mode, setMode, isDarkMode, isSystemMode } = useTheme();

  return (
    <div class={`theme-toggle ${props.className || ''}`}>
      <button
        onClick={() => {
          const current = mode();
          if (current === 'light') setMode('dark');
          else if (current === 'dark') setMode('system');
          else setMode('light');
        }}
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={`Current: ${mode()} theme`}
      >
        <div class="w-5 h-5">
          {mode() === 'light' && (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          {mode() === 'dark' && (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {mode() === 'system' && (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
};