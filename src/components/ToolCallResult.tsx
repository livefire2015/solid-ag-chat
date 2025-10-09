import { Component, Show, createSignal } from 'solid-js';

interface ToolCallResultProps {
  toolName: string;
  result: string;
  className?: string;
  compact?: boolean;
}

const ToolCallResult: Component<ToolCallResultProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(!props.compact);

  const isJsonResult = () => {
    try {
      JSON.parse(props.result);
      return true;
    } catch {
      return false;
    }
  };

  const formatResult = () => {
    if (isJsonResult()) {
      try {
        return JSON.stringify(JSON.parse(props.result), null, 2);
      } catch {
        return props.result;
      }
    }
    return props.result;
  };

  const truncateResult = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div class={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${props.className || ''}`}>
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-sm">🔧</span>
          <span class="text-sm font-medium text-gray-700">{props.toolName} result</span>
        </div>

        <Show when={props.compact && props.result.length > 100}>
          <button
            onClick={() => setIsExpanded(!isExpanded())}
            class="text-xs px-2 py-1 rounded hover:bg-gray-200 transition-colors text-gray-600"
            title={isExpanded() ? 'Show less' : 'Show more'}
          >
            {isExpanded() ? 'Less' : 'More'}
          </button>
        </Show>
      </div>

      {/* Result Content */}
      <div class="text-sm">
        <Show
          when={isExpanded()}
          fallback={
            <div class="text-gray-600 font-mono whitespace-pre-wrap">
              {truncateResult(props.result)}
            </div>
          }
        >
          <pre class="text-gray-800 font-mono text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
            {formatResult()}
          </pre>
        </Show>
      </div>

      {/* Copy Button */}
      <div class="mt-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => {
            navigator.clipboard.writeText(props.result).catch(console.error);
          }}
          class="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          title="Copy result to clipboard"
        >
          📋 Copy result
        </button>
      </div>
    </div>
  );
};

export default ToolCallResult;