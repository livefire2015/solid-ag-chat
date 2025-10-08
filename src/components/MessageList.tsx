import { Component, For, createEffect } from 'solid-js';
import type { AGUIMessage } from '../services/types';

interface MessageListProps {
  messages: AGUIMessage[];
  isLoading: boolean;
}

const MessageList: Component<MessageListProps> = (props) => {
  let messagesEndRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Scroll to bottom when new messages are added
    if (props.messages.length > 0) {
      messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return (
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <For each={props.messages}>
        {(message) => (
          <div
            class={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              class={`max-w-3xl rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900 border'
              }`}
            >
              <div class="text-sm font-medium mb-1">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div class="whitespace-pre-wrap">{message.content}</div>
              {message.timestamp && (
                <div class="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}
      </For>

      {props.isLoading && (
        <div class="flex justify-start">
          <div class="bg-gray-100 border rounded-lg px-4 py-2 max-w-3xl">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '0ms' }}></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '150ms' }}></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ 'animation-delay': '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
