import { Component, Show, createSignal, onMount } from 'solid-js';
import { createAGUIService } from '../services/agui-service';
import { createConversationStore } from '../stores/conversation-store';
import { StorageManager, createLocalStorageAdapter, createRemoteStorageAdapter } from '../services/storage';
import type { ApiConfig, StorageMode } from '../services/types';
import MessageList from './MessageList';
import MessageInput, { type MessageInputHandle } from './MessageInput';
import StatePanel from './StatePanel';
import ConversationList from './ConversationList';
import ThemeProvider, { ThemeToggle } from './ThemeProvider';
import EmptyState from './EmptyState';

interface ChatInterfaceProps {
  /** @deprecated Use apiConfig instead */
  apiUrl?: string;
  apiConfig?: ApiConfig;
  storageMode?: StorageMode;
  conversationId?: string;
  autoGenerateTitle?: boolean;
  createConversationOnFirstMessage?: boolean;
  newChatMode?: boolean;
  title?: string;
  description?: string;
  userName?: string;
  suggestions?: import('../services/types').SuggestionItem[];
  showEmptyState?: boolean;
  disclaimerText?: string;
}

const ChatInterface: Component<ChatInterfaceProps> = (props) => {
  // Create API config from props (backward compatibility)
  const apiConfig: ApiConfig = props.apiConfig || (props.apiUrl ? {
    endpoints: {
      streamMessage: props.apiUrl
    }
  } : {
    baseUrl: 'http://localhost:8000',
    endpoints: {
      streamMessage: '/agent/stream'
    }
  });

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

  // Reference to MessageInput for programmatic control
  let messageInputHandle: MessageInputHandle | undefined;

  // Handle suggestion card clicks
  const handleSuggestionClick = (suggestion: import('../services/types').SuggestionItem) => {
    if (messageInputHandle) {
      messageInputHandle.setInputValue(suggestion.title);
    }
  };

  // Auto-title generation callback
  const handleAutoTitleGeneration = async (conversationId: string) => {
    if (!props.autoGenerateTitle) return;

    const conversation = conversationStore.currentConversation();
    if (!conversation) return;

    // Only generate title for conversations with generic titles
    const genericTitles = ['New Chat', 'Welcome Chat', 'Chat', 'Conversation'];
    const isGenericTitle = genericTitles.some(generic =>
      conversation.title.includes(generic) || conversation.title.match(/^Chat \d+$/)
    );

    if (isGenericTitle && props.storageMode === 'remote') {
      try {
        const storageAdapter = createStorageAdapter();
        if ('generateTitle' in storageAdapter) {
          const newTitle = await (storageAdapter as any).generateTitle(conversationId);
          if (newTitle) {
            await conversationStore.updateConversation(conversationId, { title: newTitle });
          }
        }
      } catch (error) {
        console.error('Failed to generate title:', error);
      }
    }
  };

  // Initialize conversation based on conversationId prop and mode
  onMount(async () => {
    // Set up auto-title callback if enabled
    if (props.autoGenerateTitle !== false) {
      chatService.setAutoTitleCallback(handleAutoTitleGeneration);
    }

    if (props.conversationId) {
      // Load specific conversation from URL
      await conversationStore.loadConversation(props.conversationId);
      const conversation = conversationStore.currentConversation();
      if (conversation) {
        chatService.loadMessages(conversation.messages);
      } else {
        // Conversation ID in URL doesn't exist, create a new one with that ID
        console.warn(`Conversation ${props.conversationId} not found, creating new conversation`);
        await conversationStore.createConversation('New Chat', props.conversationId);
        await conversationStore.loadConversation(props.conversationId);
      }
    } else if (props.newChatMode || props.createConversationOnFirstMessage) {
      // New chat mode - don't create conversation yet, wait for first message
      console.log('New chat mode - conversation will be created on first message');
    } else {
      // Traditional mode - create default conversation if none exist
      if (conversationStore.conversations().length === 0) {
        const newConversationId = await conversationStore.createConversation('Welcome Chat');
        await conversationStore.loadConversation(newConversationId);
      } else {
        // Load the most recent conversation
        const conversations = conversationStore.conversations();
        await conversationStore.loadConversation(conversations[0].id);
        const conversation = conversationStore.currentConversation();
        if (conversation) {
          chatService.loadMessages(conversation.messages);
        }
      }
    }
  });

  const handleNewConversation = async () => {
    const title = `Chat ${conversationStore.conversations().length + 1}`;
    const newConversationId = await conversationStore.createConversation(title);
    await conversationStore.loadConversation(newConversationId);
    await conversationStore.loadConversations(); // Refresh list for remote storage
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
    let currentConv = conversationStore.currentConversation();
    let conversationId = currentConv?.id || props.conversationId;

    // Lazy conversation creation for new chat mode
    if (!currentConv && (props.newChatMode || props.createConversationOnFirstMessage)) {
      try {
        if (props.storageMode === 'remote') {
          // Use createConversationWithMessage for remote storage
          const storageAdapter = createStorageAdapter();
          if ('createConversationWithMessage' in storageAdapter) {
            conversationId = await (storageAdapter as any).createConversationWithMessage(
              'New Chat',
              content,
              files
            );
          } else {
            // Fallback to regular creation
            conversationId = await conversationStore.createConversation('New Chat');
          }
        } else {
          // For local storage, create conversation normally
          conversationId = await conversationStore.createConversation('New Chat');
        }

        if (conversationId) {
          await conversationStore.loadConversation(conversationId);
          currentConv = conversationStore.currentConversation();
          // Refresh conversation list for remote storage
          await conversationStore.loadConversations();
        }
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    if (!conversationId) {
      console.error('No conversation ID available for sending message');
      return;
    }

    // Send the message
    await chatService.sendMessage(content, files, conversationId);

    // Update conversation with new messages
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
            emptyStateComponent={
              (props.showEmptyState !== false && (props.userName || props.suggestions)) ? (
                <EmptyState
                  userName={props.userName}
                  suggestions={props.suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              ) : undefined
            }
          />

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={chatService.isLoading()}
            enableFileAttachments={true}
            enableMarkdown={true}
            ref={(handle) => messageInputHandle = handle}
          />

          {/* Footer with Disclaimer */}
          <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
            <Show when={props.disclaimerText} fallback={
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
            }>
              <p class="text-xs text-center text-gray-500 dark:text-gray-400">
                {props.disclaimerText}
              </p>
            </Show>
          </div>

          {/* Agent State Panel */}
          <StatePanel agentState={chatService.agentState()} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatInterface;
