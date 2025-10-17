import { Component, Show, createSignal } from 'solid-js';
import type { StreamingToolCall } from '../services/types';

interface ToolCallDisplayProps {
  toolCall: StreamingToolCall;
  className?: string;
}

const ToolCallDisplay: Component<ToolCallDisplayProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);

  const getStatusIcon = () => {
    switch (props.toolCall.status) {
      case 'starting':
        return '🔄';
      case 'building_args':
        return '📝';
      case 'executing':
        return '⚡';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusText = () => {
    switch (props.toolCall.status) {
      case 'starting':
        return 'Starting...';
      case 'building_args':
        return 'Building arguments...';
      case 'executing':
        return 'Executing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (props.toolCall.status) {
      case 'starting':
      case 'building_args':
      case 'executing':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatArguments = () => {
    if (props.toolCall.parsedArguments) {
      return JSON.stringify(props.toolCall.parsedArguments, null, 2);
    }
    return props.toolCall.arguments;
  };

  return (
    <div class={`border rounded-lg p-3 ${getStatusColor()} ${props.className || ''}`}>
      {/* Tool Call Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg">{getStatusIcon()}</span>
          <div>
            <span class="font-medium text-sm">{props.toolCall.name}</span>
            <span class="text-xs ml-2 opacity-75">{getStatusText()}</span>
          </div>
        </div>

        <Show when={props.toolCall.arguments || props.toolCall.result}>
          <button
            onClick={() => setIsExpanded(!isExpanded())}
            class="text-xs px-2 py-1 rounded hover:bg-black/10 transition-colors"
            title={isExpanded() ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded() ? '▼' : '▶'}
          </button>
        </Show>
      </div>

      {/* Tool Call Details */}
      <Show when={isExpanded()}>
        <div class="mt-3 space-y-2">
          {/* Arguments */}
          <Show when={props.toolCall.arguments}>
            <div>
              <div class="text-xs font-semibold mb-1 opacity-75">Arguments:</div>
              <pre class="text-xs bg-black/5 p-2 rounded border overflow-x-auto">
                {formatArguments()}
              </pre>
            </div>
          </Show>

          {/* Result */}
          <Show when={props.toolCall.result}>
            <div>
              <div class="text-xs font-semibold mb-1 opacity-75">Result:</div>
              <pre class="text-xs bg-black/5 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {props.toolCall.result}
              </pre>
            </div>
          </Show>

          {/* Timing Info */}
          <div class="flex justify-between text-xs opacity-60">
            <span>Started: {new Date(props.toolCall.startedAt).toLocaleTimeString()}</span>
            <Show when={props.toolCall.completedAt}>
              <span>Completed: {new Date(props.toolCall.completedAt!).toLocaleTimeString()}</span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Loading Animation for Active States */}
      <Show when={['starting', 'building_args', 'executing'].includes(props.toolCall.status)}>
        <div class="mt-2">
          <div class="flex items-center space-x-1">
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style={{ 'animation-delay': '0ms' }}></div>
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style={{ 'animation-delay': '150ms' }}></div>
            <div class="w-1 h-1 bg-current rounded-full animate-bounce" style={{ 'animation-delay': '300ms' }}></div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ToolCallDisplay;