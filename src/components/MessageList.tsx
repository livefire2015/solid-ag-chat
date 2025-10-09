import { Component, For, createEffect, createSignal, Show, onMount } from 'solid-js';
import MarkdownMessage from './MarkdownMessage';
import FilePreview from './FilePreview';
import type { EnhancedAGUIMessage, MessageAction, MarkdownOptions } from '../services/types';

interface MessageListProps {
  messages: EnhancedAGUIMessage[];
  isLoading: boolean;
  enableMarkdown?: boolean;
  enableMessageActions?: boolean;
  enableFilePreview?: boolean;
  markdownOptions?: MarkdownOptions;
  onMessageAction?: (messageId: string, action: MessageAction) => void;
  onMessageEdit?: (messageId: string) => void;
  onMessageDelete?: (messageId: string) => void;
  onMessageRetry?: (messageId: string) => void;
  onTyping?: (isTyping: boolean) => void;
  searchQuery?: string;
  className?: string;
}

const MessageList: Component<MessageListProps> = (props) => {
  const [messagesEndRef, setMessagesEndRef] = createSignal<HTMLDivElement>();
  const [hoveredMessage, setHoveredMessage] = createSignal<string | null>(null);
  const [selectedMessage, setSelectedMessage] = createSignal<string | null>(null);
  const [previewFile, setPreviewFile] = createSignal<any>(null);
  const [autoScroll, setAutoScroll] = createSignal(true);

  // Auto-scroll to bottom when new messages are added
  createEffect(() => {
    if (props.messages.length > 0 && autoScroll()) {
      const element = messagesEndRef();
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Check if user has scrolled up
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setAutoScroll(isAtBottom);
  };

  const handleMessageCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    }).catch(console.error);
  };

  const handleMessageAction = (messageId: string, action: MessageAction) => {
    props.onMessageAction?.(messageId, action);

    switch (action) {
      case 'copy':
        const message = props.messages.find(m => m.id === messageId);
        if (message) {
          handleMessageCopy(message.content);
        }
        break;
      case 'edit':
        props.onMessageEdit?.(messageId);
        break;
      case 'delete':
        props.onMessageDelete?.(messageId);
        break;
      case 'retry':
        props.onMessageRetry?.(messageId);
        break;
    }
  };

  const highlightSearchTerm = (text: string, query?: string) => {
    if (!query || !query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedMessage(messageId);
      setTimeout(() => setSelectedMessage(null), 2000);
    }
  };

  const scrollToBottom = () => {
    const element = messagesEndRef();
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
    }
  };

  const getMessageDate = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = () => {
    const groups: Array<{ date: string; messages: EnhancedAGUIMessage[] }> = [];
    let currentDate = '';
    let currentGroup: EnhancedAGUIMessage[] = [];

    props.messages.forEach(message => {
      const messageDate = getMessageDate(message.timestamp);
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  return (
    <div class={`relative flex-1 flex flex-col ${props.className || ''}`}>
      {/* Messages Container */}
      <div
        class="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        <div class="space-y-4">
          <For each={groupedMessages()}>
            {(group) => (
              <div class="space-y-4">
                {/* Date Separator */}
                <Show when={group.date}>
                  <div class="flex items-center justify-center">
                    <div class="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {group.date}
                    </div>
                  </div>
                </Show>

                {/* Messages in this date group */}
                <For each={group.messages}>
                  {(message) => (
                    <div
                      class={`group flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } ${selectedMessage() === message.id ? 'bg-blue-50 rounded-lg p-2 -m-2' : ''}`}
                      onMouseEnter={() => setHoveredMessage(message.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                      data-message-id={message.id}
                    >
                      <div class={`max-w-4xl ${message.role === 'user' ? 'w-full' : 'w-full'}`}>
                        <Show
                          when={props.enableMarkdown && message.isMarkdown}
                          fallback={
                            <div
                              class={`rounded-lg px-4 py-3 ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white ml-12'
                                  : 'bg-green-500 text-white mr-12'
                              }`}
                            >
                              {/* Message Header */}
                              <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                  <span class="text-sm font-medium">
                                    {message.role === 'user' ? 'You' : 'Assistant'}
                                  </span>
                                  <Show when={message.isEdited}>
                                    <span class="text-xs opacity-70">(edited)</span>
                                  </Show>
                                  <Show when={message.timestamp}>
                                    <span class="text-xs opacity-70">
                                      {new Date(message.timestamp!).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </Show>
                                </div>

                                {/* Quick Actions */}
                                <Show when={props.enableMessageActions && hoveredMessage() === message.id}>
                                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleMessageAction(message.id, 'copy')}
                                      class="p-1 hover:bg-gray-100 rounded text-xs"
                                      title="Copy"
                                    >
                                      📋
                                    </button>
                                    <Show when={message.role === 'user'}>
                                      <button
                                        onClick={() => handleMessageAction(message.id, 'edit')}
                                        class="p-1 hover:bg-gray-100 rounded text-xs"
                                        title="Edit"
                                      >
                                        ✏️
                                      </button>
                                    </Show>
                                    <Show when={message.role === 'assistant'}>
                                      <button
                                        onClick={() => handleMessageAction(message.id, 'retry')}
                                        class="p-1 hover:bg-gray-100 rounded text-xs"
                                        title="Retry"
                                      >
                                        🔄
                                      </button>
                                    </Show>
                                    <button
                                      onClick={() => handleMessageAction(message.id, 'delete')}
                                      class="p-1 hover:bg-gray-100 rounded text-xs"
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </Show>
                              </div>

                              {/* Message Content */}
                              <div
                                class="whitespace-pre-wrap leading-relaxed"
                                innerHTML={highlightSearchTerm(message.content, props.searchQuery)}
                              />

                              {/* File Attachments */}
                              <Show when={message.attachments && message.attachments.length > 0}>
                                <div class="mt-3 space-y-2">
                                  <For each={message.attachments}>
                                    {(attachment) => (
                                      <div class="inline-block mr-2 mb-2">
                                        <button
                                          onClick={() => setPreviewFile(attachment)}
                                          class="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded border text-sm transition-colors"
                                        >
                                          <span class="text-lg">📎</span>
                                          <div class="text-left">
                                            <div class="font-medium text-gray-900 truncate max-w-32">
                                              {attachment.name}
                                            </div>
                                            <div class="text-xs text-gray-500">
                                              {attachment.size ? `${Math.round(attachment.size / 1024)}KB` : ''}
                                            </div>
                                          </div>
                                        </button>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </Show>
                            </div>
                          }
                        >
                          <MarkdownMessage
                            message={message}
                            onCopy={handleMessageCopy}
                            onEdit={props.onMessageEdit}
                            onDelete={props.onMessageDelete}
                            onRetry={props.onMessageRetry}
                            showActions={props.enableMessageActions}
                            enableCodeCopy={true}
                            markdownOptions={props.markdownOptions}
                            className={message.role === 'user' ? 'ml-12' : 'mr-12'}
                          />
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>

          {/* Loading Indicator */}
          <Show when={props.isLoading}>
            <div class="flex justify-start">
              <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-xs mr-12">
                <div class="flex items-center gap-2">
                  <div class="text-sm font-medium text-gray-700 mb-1">Assistant</div>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '0ms' }}></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '150ms' }}></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '300ms' }}></div>
                </div>
              </div>
            </div>
          </Show>

          {/* Typing Indicator */}
          <Show when={props.onTyping}>
            <div class="flex justify-start">
              <div class="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">
                <span>User is typing...</span>
              </div>
            </div>
          </Show>

          {/* Scroll anchor */}
          <div ref={setMessagesEndRef} class="h-1" />
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      <Show when={!autoScroll()}>
        <div class="absolute bottom-4 right-4">
          <button
            onClick={scrollToBottom}
            class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
            title="Scroll to bottom"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </Show>

      {/* File Preview Modal */}
      <Show when={previewFile()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="max-w-4xl max-h-full w-full">
            <FilePreview
              file={previewFile()}
              onClose={() => setPreviewFile(null)}
              onDownload={() => {
                // Handle file download
                const file = previewFile();
                if (file.url) {
                  const a = document.createElement('a');
                  a.href = file.url;
                  a.download = file.name;
                  a.click();
                }
              }}
              className="w-full h-full"
            />
          </div>
        </div>
      </Show>

      {/* Search Results Info */}
      <Show when={props.searchQuery && props.searchQuery.trim()}>
        <div class="absolute top-4 left-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-sm">
          <span class="font-medium">Searching for:</span> "{props.searchQuery}"
          <button
            onClick={() => {
              // Clear search - this would be handled by parent component
            }}
            class="ml-2 text-yellow-700 hover:text-yellow-900"
          >
            ✕
          </button>
        </div>
      </Show>
    </div>
  );
};

export default MessageList;
