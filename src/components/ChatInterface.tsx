import { Component, Show, createSignal, onMount } from 'solid-js';
import { createAGUIService } from '../services/agui-service';
import { createConversationStore } from '../stores/conversation-store';
import { StorageManager, createLocalStorageAdapter, createRemoteStorageAdapter } from '../services/storage';
import type { ApiConfig, StorageMode } from '../services/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatePanel from './StatePanel';
import ConversationList from './ConversationList';
import ThemeProvider, { ThemeToggle } from './ThemeProvider';

interface ChatInterfaceProps {
  apiUrl?: string;  // Backward compatibility
  apiConfig?: ApiConfig;
  storageMode?: StorageMode;
  title?: string;
  description?: string;
}

const ChatInterface: Component<ChatInterfaceProps> = (props) => {
  // Create API config from props (backward compatibility)
  const apiConfig: ApiConfig = props.apiConfig || {
    baseUrl: props.apiUrl || 'http://localhost:8000',
    endpoints: {
      streamMessage: '/agent/stream'
    }
  };

  // Create storage adapter based on mode
  const createStorageAdapter = () => {
    const mode = props.storageMode || 'local';
    switch (mode) {
      case 'remote':
        return createRemoteStorageAdapter(apiConfig);
      case 'hybrid':
        // For now, hybrid mode falls back to local
        console.warn('Hybrid storage mode not yet implemented, using local storage');
        return createLocalStorageAdapter();
      case 'local':
      default:
        return createLocalStorageAdapter();
    }
  };

  const chatService = createAGUIService(apiConfig);
  const storageManager = new StorageManager(createStorageAdapter());
  const conversationStore = createConversationStore(storageManager);
  const [showConversations, setShowConversations] = createSignal(false);

  // Initialize with a default conversation
  onMount(async () => {
    if (conversationStore.conversations().length === 0) {
      await conversationStore.createConversation('Welcome Chat');
    }
  });

  const handleNewConversation = async () => {
    const title = `Chat ${conversationStore.conversations().length + 1}`;
    const newConversationId = await conversationStore.createConversation(title);
    await conversationStore.loadConversation(newConversationId);
    chatService.clearMessages();
  };

  const handleConversationSelect = async (conversationId: string) => {
    await conversationStore.loadConversation(conversationId);
    const conversation = conversationStore.currentConversation();
    if (conversation) {
      chatService.loadMessages(conversation.messages);
    }
    setShowConversations(false);
  };

  const handleSendMessage = async (content: string, files?: any[]) => {
    await chatService.sendMessage(content, files);
    const currentConv = conversationStore.currentConversation();
    if (currentConv) {
      await conversationStore.updateConversation(currentConv.id, {
        messages: chatService.messages()
      });
    }
  };

  return (
    <ThemeProvider>
      <div class="flex h-screen bg-white">
        {/* Sidebar */}
        <Show when={showConversations()}>
          <div class="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <ConversationList
              conversations={conversationStore.conversations()}
              currentConversationId={conversationStore.currentConversationId()}
              onConversationSelect={handleConversationSelect}
              onConversationCreate={handleNewConversation}
              onConversationDelete={async (id: string) => {
                await conversationStore.deleteConversation(id);
                if (conversationStore.conversations().length > 0) {
                  const firstConv = conversationStore.conversations()[0];
                  await handleConversationSelect(firstConv.id);
                }
              }}
              onConversationRename={async (id: string, newTitle: string) => {
                await conversationStore.updateConversation(id, { title: newTitle });
              }}
            />
          </div>
        </Show>

        {/* Main Chat Area */}
        <div class="flex flex-col flex-1">
          {/* Header */}
          <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <button
                  onClick={() => setShowConversations(!showConversations())}
                  class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Toggle conversations"
                >
                  <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{props.title || "Nova Chat"}</h1>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{props.description || "Let language become the interface"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          <Show when={chatService.error()}>
            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mx-4 mt-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-700 dark:text-red-300">{chatService.error()}</p>
                </div>
                <div class="ml-auto pl-3">
                  <button
                    onClick={() => chatService.clearMessages()}
                    class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
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
            enableMarkdown={true}
          />

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={chatService.isLoading()}
            enableFileAttachments={true}
            enableMarkdown={true}
          />

          {/* Footer */}
          <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400">Powered by:</span>
                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">SolidJS</span>
                <span class="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">PydanticAI</span>
                <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded">AG-UI</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                AI can make mistakes. Please verify important information.
              </p>
            </div>
          </div>

          {/* Agent State Panel */}
          <StatePanel agentState={chatService.agentState()} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatInterface;
