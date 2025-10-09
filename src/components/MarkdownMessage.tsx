import { Component, createSignal, createMemo, Show, For, onMount } from 'solid-js';
import { parseMarkdown, extractCodeBlocks, getPlainText } from '../utils/markdown';
import type { EnhancedAGUIMessage, MarkdownOptions } from '../services/types';

interface MarkdownMessageProps {
  message: EnhancedAGUIMessage;
  onCopy?: (text: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  showActions?: boolean;
  enableCodeCopy?: boolean;
  markdownOptions?: MarkdownOptions;
  className?: string;
}

const MarkdownMessage: Component<MarkdownMessageProps> = (props) => {
  const [showRawContent, setShowRawContent] = createSignal(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = createSignal<number | null>(null);

  const markdownOptions = () => ({
    enableCodeHighlighting: true,
    enableTables: true,
    enableTaskLists: true,
    enableMath: false,
    ...props.markdownOptions
  });

  const renderedContent = createMemo(() => {
    if (!props.message.isMarkdown || showRawContent()) {
      return props.message.content;
    }
    return parseMarkdown(props.message.content, markdownOptions());
  });

  const codeBlocks = createMemo(() => {
    if (props.message.isMarkdown && props.enableCodeCopy) {
      return extractCodeBlocks(props.message.content);
    }
    return [];
  });

  const plainText = createMemo(() => {
    return getPlainText(props.message.content);
  });

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedCodeIndex(index);
        setTimeout(() => setCopiedCodeIndex(null), 2000);
      }
      props.onCopy?.(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Add code copy buttons after component mounts
  onMount(() => {
    if (!props.enableCodeCopy || !props.message.isMarkdown) return;

    // Find all code blocks and add copy buttons
    const codeElements = document.querySelectorAll(`[data-message-id="${props.message.id}"] pre.code-block`);
    codeElements.forEach((element, index) => {
      const codeBlock = codeBlocks()[index];
      if (!codeBlock) return;

      // Check if copy button already exists
      if (element.querySelector('.code-copy-button')) return;

      const copyButton = document.createElement('button');
      copyButton.className = 'code-copy-button absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors';
      copyButton.textContent = copiedCodeIndex() === index ? 'Copied!' : 'Copy';
      copyButton.onclick = () => copyToClipboard(codeBlock.code, index);

      // Make the pre element relative for absolute positioning
      (element as HTMLElement).style.position = 'relative';
      element.appendChild(copyButton);
    });
  });

  return (
    <div
      class={`markdown-message ${props.className || ''}`}
      data-message-id={props.message.id}
      data-role={props.message.role}
    >
      {/* Message Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">
            {props.message.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <Show when={props.message.isEdited}>
            <span class="text-xs text-gray-500">(edited)</span>
          </Show>
          <Show when={formatTimestamp(props.message.timestamp)}>
            <span class="text-xs text-gray-500">
              {formatTimestamp(props.message.timestamp)}
            </span>
          </Show>
        </div>

        {/* Actions */}
        <Show when={props.showActions}>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Toggle Raw Content */}
            <Show when={props.message.isMarkdown}>
              <button
                onClick={() => setShowRawContent(!showRawContent())}
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title={showRawContent() ? 'Show rendered' : 'Show raw markdown'}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
            </Show>

            {/* Copy Message */}
            <button
              onClick={() => copyToClipboard(plainText())}
              class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Copy message"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Edit Message */}
            <Show when={props.onEdit && props.message.role === 'user'}>
              <button
                onClick={() => props.onEdit?.(props.message.id)}
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Edit message"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </Show>

            {/* Retry (for assistant messages) */}
            <Show when={props.onRetry && props.message.role === 'assistant'}>
              <button
                onClick={() => props.onRetry?.(props.message.id)}
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Retry message"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </Show>

            {/* Delete Message */}
            <Show when={props.onDelete}>
              <button
                onClick={() => props.onDelete?.(props.message.id)}
                class="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                title="Delete message"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </Show>
          </div>
        </Show>
      </div>

      {/* Message Content */}
      <div class="message-content">
        <Show
          when={props.message.isMarkdown && !showRawContent()}
          fallback={
            <pre class="whitespace-pre-wrap font-sans text-sm text-gray-900 leading-relaxed">
              {props.message.content}
            </pre>
          }
        >
          <div
            class="markdown-content prose prose-sm max-w-none"
            innerHTML={renderedContent()}
          />
        </Show>
      </div>

      {/* File Attachments */}
      <Show when={props.message.attachments && props.message.attachments.length > 0}>
        <div class="mt-3 space-y-2">
          <div class="text-xs text-gray-500 font-medium">Attachments:</div>
          <For each={props.message.attachments}>
            {(attachment) => (
              <div class="flex items-center gap-2 p-2 bg-gray-50 rounded border text-sm">
                <div class="text-lg">📎</div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 truncate">
                    {attachment.name}
                  </div>
                  <div class="text-xs text-gray-500">
                    {attachment.size ? `${Math.round(attachment.size / 1024)}KB` : ''} • {attachment.type}
                  </div>
                </div>
                <Show when={attachment.uploaded}>
                  <div class="text-green-600" title="Uploaded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Metadata */}
      <Show when={props.message.metadata && Object.keys(props.message.metadata).length > 0}>
        <details class="mt-2">
          <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Message metadata
          </summary>
          <pre class="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(props.message.metadata, null, 2)}
          </pre>
        </details>
      </Show>

    </div>
  );
};

export default MarkdownMessage;