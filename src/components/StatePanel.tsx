import { Component, createSignal, Show, For } from 'solid-js';
import type { AgentState } from '../services/types';

interface StatePanelProps {
  agentState: AgentState | null;
}

const StatePanel: Component<StatePanelProps> = (props) => {
  const [isVisible, setIsVisible] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'thoughts' | 'proposals' | 'memory'>('thoughts');

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible())}
        class="fixed right-4 top-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
      >
        {isVisible() ? 'Hide' : 'Show'} Agent State
      </button>

      {/* Side Panel */}
      <Show when={isVisible()}>
        <div class="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l z-40 overflow-y-auto">
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900">Agent State</h2>
              <button
                onClick={() => setIsVisible(false)}
                class="text-gray-500 hover:text-gray-700"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div class="flex border-b mb-4">
              <button
                onClick={() => setActiveTab('thoughts')}
                class={`flex-1 py-2 text-sm font-medium ${
                  activeTab() === 'thoughts'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Thoughts
              </button>
              <button
                onClick={() => setActiveTab('proposals')}
                class={`flex-1 py-2 text-sm font-medium ${
                  activeTab() === 'proposals'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Proposals
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                class={`flex-1 py-2 text-sm font-medium ${
                  activeTab() === 'memory'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Memory
              </button>
            </div>

            {/* Content */}
            <Show when={!props.agentState}>
              <div class="text-gray-500 text-center py-8">
                No agent state available
              </div>
            </Show>

            <Show when={props.agentState}>
              {/* Thoughts Tab */}
              <Show when={activeTab() === 'thoughts'}>
                <div class="space-y-4">
                  <Show when={props.agentState?.currentThought}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Current Thought</h3>
                      <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {props.agentState?.currentThought}
                      </p>
                    </div>
                  </Show>

                  <Show when={props.agentState?.progress !== undefined}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Progress</h3>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div
                          class="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${props.agentState?.progress}%` }}
                        />
                      </div>
                      <p class="text-xs text-gray-500 mt-1">{props.agentState?.progress}%</p>
                    </div>
                  </Show>

                  <Show when={props.agentState?.nextActions && props.agentState.nextActions.length > 0}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Next Actions</h3>
                      <ul class="space-y-2">
                        <For each={props.agentState?.nextActions}>
                          {(action) => (
                            <li class="text-sm text-gray-600 flex items-start">
                              <span class="text-indigo-600 mr-2">•</span>
                              {action}
                            </li>
                          )}
                        </For>
                      </ul>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Memory Tab */}
              <Show when={activeTab() === 'memory'}>
                <div class="space-y-4">
                  <Show when={props.agentState?.workingMemory}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Working Memory</h3>
                      <pre class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(props.agentState?.workingMemory, null, 2)}
                      </pre>
                    </div>
                  </Show>

                  <Show when={props.agentState?.reasoningChain && props.agentState.reasoningChain.length > 0}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Reasoning Chain</h3>
                      <ol class="space-y-2">
                        <For each={props.agentState?.reasoningChain}>
                          {(step, index) => (
                            <li class="text-sm text-gray-600 flex items-start">
                              <span class="text-indigo-600 mr-2 font-medium">{index() + 1}.</span>
                              {step}
                            </li>
                          )}
                        </For>
                      </ol>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Proposals Tab */}
              <Show when={activeTab() === 'proposals'}>
                <div class="text-gray-500 text-center py-8">
                  No proposals available
                </div>
              </Show>
            </Show>

            {/* Footer */}
            <Show when={props.agentState}>
              <div class="mt-6 pt-4 border-t text-xs text-gray-500">
                <Show when={props.agentState?.version}>
                  <p>Version: {props.agentState?.version}</p>
                </Show>
                <Show when={props.agentState?.lastUpdated}>
                  <p>Last Updated: {new Date(props.agentState?.lastUpdated!).toLocaleString()}</p>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
};

export default StatePanel;
