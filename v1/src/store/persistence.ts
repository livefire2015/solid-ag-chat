/**
 * Browser persistence utilities for agent state
 *
 * Saves agentStateByConversation to localStorage so it survives page refreshes.
 * Future: Will be replaced with database persistence.
 */

import type { AgentStateMap } from '../types/state';

const STORAGE_KEY = 'solid-ag-chat:agentState';
const STORAGE_VERSION = 1;

interface PersistedData {
  version: number;
  timestamp: number;
  data: AgentStateMap;
}

/**
 * Debounce utility
 */
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Save agent state to localStorage
 */
export function saveAgentState(state: AgentStateMap): void {
  try {
    const data: PersistedData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data: state,
    };

    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);

    console.log('[persistence] Saved agent state to localStorage', {
      conversations: Object.keys(state).length,
      size: `${(serialized.length / 1024).toFixed(2)} KB`,
    });
  } catch (error) {
    console.error('[persistence] Failed to save agent state:', error);

    // Handle QuotaExceededError
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[persistence] localStorage quota exceeded. Consider implementing LRU cache.');
    }
  }
}

/**
 * Create debounced save function
 */
export const debouncedSaveAgentState = debounce(saveAgentState, 500);

/**
 * Load agent state from localStorage
 */
export function loadAgentState(): AgentStateMap | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      console.log('[persistence] No persisted agent state found');
      return null;
    }

    const parsed: PersistedData = JSON.parse(stored);

    // Version check for future migrations
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('[persistence] Version mismatch. Expected', STORAGE_VERSION, 'got', parsed.version);
      // Could implement migration logic here in the future
      return null;
    }

    console.log('[persistence] Loaded agent state from localStorage', {
      conversations: Object.keys(parsed.data).length,
      age: `${((Date.now() - parsed.timestamp) / 1000 / 60).toFixed(1)} minutes`,
    });

    return parsed.data;
  } catch (error) {
    console.error('[persistence] Failed to load agent state:', error);
    return null;
  }
}

/**
 * Clear persisted agent state (for debugging)
 */
export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[persistence] Cleared persisted agent state');
  } catch (error) {
    console.error('[persistence] Failed to clear persisted state:', error);
  }
}

/**
 * Get persisted state for debugging (doesn't parse, returns raw)
 */
export function viewPersistedState(): PersistedData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('[persistence] Failed to view persisted state:', error);
    return null;
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): { used: number; total: number; percentage: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const used = stored ? stored.length : 0;
    const total = 5 * 1024 * 1024; // Approximate 5MB localStorage limit
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  } catch (error) {
    console.error('[persistence] Failed to get storage stats:', error);
    return { used: 0, total: 0, percentage: 0 };
  }
}
