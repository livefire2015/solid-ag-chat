import { Component } from 'solid-js';
import type { SuggestionItem } from '../services/types';

interface SuggestionCardProps {
  suggestion: SuggestionItem;
  onClick: () => void;
}

const SuggestionCard: Component<SuggestionCardProps> = (props) => {
  return (
    <button
      onClick={props.onClick}
      class="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left w-full group"
    >
      {/* Icon */}
      <div class="flex items-center gap-3 mb-3 w-full">
        <div class="flex items-center justify-center w-8 h-8 bg-teal-500 rounded-full flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
          {props.suggestion.category}
        </h3>
      </div>

      {/* Title */}
      <p class="text-xs text-gray-600 leading-relaxed">
        {props.suggestion.title}
      </p>
    </button>
  );
};

export default SuggestionCard;
