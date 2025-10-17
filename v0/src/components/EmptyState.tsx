import { Component, For, Show } from 'solid-js';
import SuggestionCard from './SuggestionCard';
import type { SuggestionItem } from '../services/types';

interface EmptyStateProps {
  userName?: string;
  subtitle?: string;
  suggestions?: SuggestionItem[];
  onSuggestionClick: (suggestion: SuggestionItem) => void;
  className?: string;
}

const EmptyState: Component<EmptyStateProps> = (props) => {
  const defaultSubtitle = 'How can I help?';

  return (
    <div class={`flex flex-col items-center justify-center min-h-[60vh] px-4 ${props.className || ''}`}>
      {/* Greeting */}
      <div class="text-center mb-12">
        <Show when={props.userName} fallback={
          <h1 class="text-teal-500 text-4xl font-bold mb-2">
            Hello
          </h1>
        }>
          <h1 class="text-teal-500 text-4xl font-bold mb-2">
            Hello, {props.userName}
          </h1>
        </Show>
        <h2 class="text-gray-800 text-2xl font-normal">
          {props.subtitle || defaultSubtitle}
        </h2>
      </div>

      {/* Suggestion Cards */}
      <Show when={props.suggestions && props.suggestions.length > 0}>
        <div class="w-full max-w-5xl">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={props.suggestions}>
              {(suggestion) => (
                <SuggestionCard
                  suggestion={suggestion}
                  onClick={() => props.onSuggestionClick(suggestion)}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default EmptyState;
