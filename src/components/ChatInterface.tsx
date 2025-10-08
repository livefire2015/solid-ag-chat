import { Component, Show } from 'solid-js';
import { createAGUIService } from '../services/agui-service';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatePanel from './StatePanel';

interface ChatInterfaceProps {
  apiUrl?: string;
}

const ChatInterface: Component<ChatInterfaceProps> = (props) => {
  const chatService = createAGUIService(props.apiUrl);

  return (
    <div class="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div class="bg-white border-b px-6 py-4 shadow-sm">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Nova Chat</h1>
          <p class="text-sm text-gray-500">AG-UI Protocol Chat Interface</p>
        </div>
      </div>

      {/* Error Display */}
      <Show when={chatService.error()}>
        <div class="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{chatService.error()}</p>
            </div>
            <div class="ml-auto pl-3">
              <button
                onClick={() => chatService.clearMessages()}
                class="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Chat Messages */}
      <MessageList
        messages={chatService.messages()}
        isLoading={chatService.isLoading()}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={chatService.sendMessage}
        disabled={chatService.isLoading()}
      />

      {/* Footer */}
      <div class="border-t bg-white px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Powered by:</span>
            <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">SolidJS</span>
            <span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">PydanticAI</span>
            <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">AG-UI</span>
          </div>
          <p class="text-xs text-gray-500">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Agent State Panel */}
      <StatePanel agentState={chatService.agentState()} />
    </div>
  );
};

export default ChatInterface;
