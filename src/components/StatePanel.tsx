import { Component, createSignal, Show } from 'solid-js';
import type { AgentState } from '../services/types';

interface StatePanelProps {
  agentState: AgentState | null;
}

const StatePanel: Component<StatePanelProps> = (props) => {
  const [isVisible, setIsVisible] = createSignal(false);

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.every(item => typeof item === 'string')) {
        return value.join(', ');
      }
    }
    return JSON.stringify(value, null, 2);
  };

  const renderStateValue = (key: string, value: any, depth: number = 0) => {
    const indent = depth * 16;

    if (value === null || value === undefined) {
      return (
        <div class="flex items-start" style={{ "margin-left": `${indent}px` }}>
          <span class="text-blue-600 dark:text-blue-400 font-medium mr-2">{key}:</span>
          <span class="text-gray-500 dark:text-gray-400 italic">{String(value)}</span>
        </div>
      );
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div style={{ "margin-left": `${indent}px` }}>
          <div class="text-blue-600 dark:text-blue-400 font-medium mb-1">{key}:</div>
          <div class="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
            {Object.entries(value).map(([subKey, subValue]) =>
              renderStateValue(subKey, subValue, depth + 1)
            )}
          </div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div style={{ "margin-left": `${indent}px` }}>
          <div class="text-blue-600 dark:text-blue-400 font-medium mb-1">
            {key}: <span class="text-gray-500 text-sm">({value.length} items)</span>
          </div>
          <div class="ml-4">
            {value.length > 0 && (
              <div class="space-y-1">
                {value.map((item, index) => (
                  <div class="flex items-start">
                    <span class="text-gray-400 mr-2 text-sm">{index}.</span>
                    <span class="text-gray-700 dark:text-gray-300">
                      {typeof item === 'object' ? JSON.stringify(item, null, 2) : formatValue(item)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div class="flex items-start" style={{ "margin-left": `${indent}px` }}>
        <span class="text-blue-600 dark:text-blue-400 font-medium mr-2">{key}:</span>
        <span class="text-gray-700 dark:text-gray-300">{formatValue(value)}</span>
      </div>
    );
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible())}
        class="fixed top-4 right-4 z-50 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        title={isVisible() ? 'Hide Agent State' : 'Show Agent State'}
      >
        <Show when={isVisible()} fallback={
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        }>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Show>
      </button>

      {/* Side Panel */}
      <Show when={isVisible()}>
        <div class="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-40 overflow-y-auto">
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Agent State</h2>
              <button
                onClick={() => setIsVisible(false)}
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* State Content */}
            <Show when={!props.agentState || Object.keys(props.agentState).length === 0}>
              <div class="text-gray-500 dark:text-gray-400 text-center py-8">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-sm">No agent state available</p>
                <p class="text-xs mt-2 text-gray-400 dark:text-gray-500">
                  State will appear here when the agent provides updates
                </p>
              </div>
            </Show>

            <Show when={props.agentState && Object.keys(props.agentState).length > 0}>
              <div class="space-y-4">
                {/* State Snapshot/Delta Indicator */}
                <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-4">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                      Live Agent State
                    </p>
                  </div>
                </div>

                {/* Render State Properties */}
                <div class="space-y-3">
                  {props.agentState && Object.entries(props.agentState).map(([key, value]) =>
                    renderStateValue(key, value)
                  )}
                </div>

                {/* Raw JSON View (Collapsible) */}
                <details class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <summary class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                    View Raw JSON
                  </summary>
                  <pre class="mt-3 text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto">
                    <code class="text-gray-700 dark:text-gray-300">
                      {JSON.stringify(props.agentState, null, 2)}
                    </code>
                  </pre>
                </details>
              </div>
            </Show>

            {/* Footer with metadata */}
            <Show when={props.agentState}>
              <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <Show when={props.agentState?.version}>
                  <p>Version: {props.agentState?.version}</p>
                </Show>
                <Show when={props.agentState?.lastUpdated}>
                  <p>Last Updated: {new Date(props.agentState?.lastUpdated!).toLocaleString()}</p>
                </Show>
                <p class="mt-2 text-gray-400 dark:text-gray-500">
                  Updates via StateSnapshot & StateDelta (JSON Patch)
                </p>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
};

export default StatePanel;