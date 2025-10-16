import { Component, Show, createSignal, onMount, createMemo } from 'solid-js';
import { createAGUIService } from '../services/agui-service';
import { createConversationStore } from '../stores/conversation-store';
import { StorageManager, createLocalStorageAdapter, createRemoteStorageAdapter } from '../services/storage';
import type {
  ApiConfig,
  ChatService,
  ChatConfig,
  ChatEventHandlers,
  ChatMode,
  ServiceStatus
} from '../services/types';
import MessageList from './MessageList';
import MessageInput, { type MessageInputHandle } from './MessageInput';
import StatePanel from './StatePanel';
import ConversationList from './ConversationList';
import ThemeProvider, { ThemeToggle } from './ThemeProvider';
import EmptyState from './EmptyState';

interface ChatInterfaceProps {
  // Backward compatibility (keep only this)
  apiUrl?: string;

  // Core mode selection
  mode?: ChatMode;

  // Single configuration object with smart defaults
  config?: Partial<ChatConfig>;

  // Single event handler object
  onEvents?: Partial<ChatEventHandlers>;
}

const ChatInterface: Component<ChatInterfaceProps> = (props) => {
  // Determine mode with smart defaults
  const mode = createMemo((): ChatMode => {
    if (props.mode) return props.mode;

    // Auto-detect based on configuration
    if (props.config?.conversations || props.onEvents?.onConversationCreate) {
      return 'controlled';
    }

    if (props.config?.apiConfig || props.config?.storageConfig) {
      return 'remote';
    }

    return 'local'; // Default
  });

  // Detect controlled mode (controlled mode implies external state management)
  const isControlled = createMemo(() => mode() === 'controlled');

  // API configuration with smart defaults
  const apiConfig = createMemo((): ApiConfig => {
    // Check config object first
    if (props.config?.apiConfig) return props.config.apiConfig;

    // Backward compatibility with apiUrl
    if (props.apiUrl) return {
      endpoints: { streamMessage: props.apiUrl }
    };

    // Default configuration
    return {
      baseUrl: 'http://localhost:8000',
      endpoints: { streamMessage: '/agent/stream' }
    };
  });

  const storageConfig = createMemo((): ApiConfig => {
    // Use dedicated storage config if provided
    if (props.config?.storageConfig) return props.config.storageConfig;

    // Fall back to main API config
    return apiConfig();
  });

  // Memoized storage adapter creation (fixes cache-wiping issue)
  const storageAdapter = createMemo(() => {
    // Use injected adapter if provided
    if (props.config?.storageAdapter) {
      return props.config.storageAdapter;
    }

    const currentMode = mode();
    switch (currentMode) {
      case 'remote':
      case 'controlled': // Controlled mode typically uses remote storage
        return createRemoteStorageAdapter(storageConfig());
      case 'local':
      default:
        return createLocalStorageAdapter();
    }
  });

  // Dependency injection for services
  const chatService = createMemo(() => {
    if (props.config?.chatService) {
      return props.config.chatService;
    }
    return createAGUIService(apiConfig());
  });

  const storageManager = createMemo(() => {
    return new StorageManager(storageAdapter());
  });

  // Conversation store creation (only for uncontrolled mode)
  const shouldAutoLoad = createMemo(() => {
    if (isControlled()) return false;
    // Auto-load unless explicitly creating on first message
    return !props.config?.createOnFirstMessage;
  });

  const conversationStore = createMemo(() => {
    if (isControlled()) {
      // Return a minimal store interface for controlled mode
      return null;
    }
    return createConversationStore(storageManager(), shouldAutoLoad());
  });

  const [showConversations, setShowConversations] = createSignal(false);

  // Status and loading state management
  const [serviceStatus, setServiceStatus] = createSignal<ServiceStatus>({
    loading: false,
    error: undefined
  });

  // Status change callbacks
  const handleStatusChange = (status: ServiceStatus) => {
    setServiceStatus(status);
    props.onEvents?.onStatusChange?.(status);
  };

  // Combined loading state for UI
  const isLoading = createMemo(() => {
    if (isControlled()) {
      // In controlled mode, no internal loading state
      return false;
    }
    const store = conversationStore();
    const chat = chatService();
    return serviceStatus().loading || (store?.isLoading?.() ?? false) || (chat?.isLoading?.() ?? false);
  });

  // Combined error state for UI
  const errorState = createMemo(() => {
    if (isControlled()) {
      return null;
    }
    const store = conversationStore();
    const chat = chatService();
    return serviceStatus().error || store?.error?.() || chat?.error?.() || null;
  });

  // Conversations list (controlled vs uncontrolled)
  const sidebarConversations = createMemo(() => {
    if (!showConversations() || props.config?.showSidebar === false) {
      return [];
    }

    if (isControlled()) {
      return props.config?.conversations || [];
    }

    const store = conversationStore();
    return store ? store.conversations() : [];
  });

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
    if (!props.config?.autoTitle) return;

    try {
      handleStatusChange({ loading: true });

      if (isControlled()) {
        // In controlled mode, delegate to parent
        if (props.onEvents?.onConversationUpdate) {
          // Generate title via storage adapter
          const adapter = storageAdapter();
          if ('generateTitle' in adapter) {
            const newTitle = await (adapter as any).generateTitle(conversationId);
            if (newTitle) {
              await props.onEvents.onConversationUpdate(conversationId, { title: newTitle });
            }
          }
        }
        return;
      }

      // Uncontrolled mode
      const store = conversationStore();
      if (!store) return;

      const conversation = store.currentConversation();
      if (!conversation) return;

      // Only generate title for conversations with generic titles
      const genericTitles = ['New Chat', 'Welcome Chat', 'Chat', 'Conversation'];
      const isGenericTitle = genericTitles.some(generic =>
        conversation.title.includes(generic) || conversation.title.match(/^Chat \d+$/)
      );

      if (isGenericTitle && mode() === 'remote') {
        const adapter = storageAdapter();
        if ('generateTitle' in adapter) {
          const newTitle = await (adapter as any).generateTitle(conversationId);
          if (newTitle) {
            await store.updateConversation(conversationId, { title: newTitle });
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
      handleStatusChange({ loading: false, error: error instanceof Error ? error.message : 'Title generation failed' });
    } finally {
      handleStatusChange({ loading: false });
    }
  };

  // Initialize conversation based on conversationId prop and mode
  onMount(async () => {
    try {
      handleStatusChange({ loading: true });

      // Set up auto-title callback if enabled
      const chat = chatService();
      if (props.config?.autoTitle !== false && chat.setAutoTitleCallback) {
        chat.setAutoTitleCallback(handleAutoTitleGeneration);
      }

      // In controlled mode, delegate initialization to parent
      if (isControlled()) {
        if (props.config?.conversationId && props.onEvents?.onConversationSelect) {
          await props.onEvents.onConversationSelect(props.config.conversationId);
        }
        return;
      }

      // Uncontrolled mode initialization
      const store = conversationStore();
      if (!store) return;

      if (props.config?.conversationId) {
        // Load specific conversation from URL
        await store.loadConversation(props.config.conversationId);
        const conversation = store.currentConversation();
        if (conversation) {
          chat.loadMessages(conversation.messages);
        } else {
          // Conversation ID in URL doesn't exist, create a new one with that ID
          console.warn(`Conversation ${props.config.conversationId} not found, creating new conversation`);
          await store.createConversation('New Chat', props.config.conversationId);
          await store.loadConversation(props.config.conversationId);
        }
      } else if (props.config?.createOnFirstMessage) {
        // New chat mode - don't create conversation yet, wait for first message
        console.log('New chat mode - conversation will be created on first message');
        return;
      } else {
        // Traditional mode - create default conversation if none exist
        if (store.conversations().length === 0) {
          const newConversationId = await store.createConversation('Welcome Chat');
          await store.loadConversation(newConversationId);
        } else {
          // Load the most recent conversation
          const conversations = store.conversations();
          await store.loadConversation(conversations[0].id);
          const conversation = store.currentConversation();
          if (conversation) {
            chat.loadMessages(conversation.messages);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      handleStatusChange({
        loading: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      });
    } finally {
      handleStatusChange({ loading: false });
    }
  });

  const handleNewConversation = async () => {
    try {
      // If external handler is provided, use it instead of internal logic
      if (props.onEvents?.onNewConversation) {
        props.onEvents.onNewConversation();
        return;
      }

      // Controlled mode - delegate to parent
      if (isControlled() && props.onEvents?.onConversationCreate) {
        const conversations = props.config?.conversations || [];
        const title = `Chat ${conversations.length + 1}`;
        await props.onEvents.onConversationCreate({ title });
        return;
      }

      // Uncontrolled mode - default behavior for backward compatibility
      const store = conversationStore();
      if (!store) return;

      handleStatusChange({ loading: true });
      const title = `Chat ${store.conversations().length + 1}`;
      const newConversationId = await store.createConversation(title);
      await store.loadConversation(newConversationId);
      await store.loadConversations(); // Refresh list for remote storage
      chatService().clearMessages();
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      handleStatusChange({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create conversation'
      });
    } finally {
      handleStatusChange({ loading: false });
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    try {
      // Controlled mode - delegate to parent
      if (isControlled()) {
        if (props.onEvents?.onConversationSelect) {
          await props.onEvents.onConversationSelect(conversationId);
        }
        setShowConversations(false);
        return;
      }

      // Uncontrolled mode
      const store = conversationStore();
      if (!store) return;

      handleStatusChange({ loading: true });
      await store.loadConversation(conversationId);
      const conversation = store.currentConversation();
      if (conversation) {
        chatService().loadMessages(conversation.messages);
      }
      setShowConversations(false);
    } catch (error) {
      console.error('Failed to select conversation:', error);
      handleStatusChange({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load conversation'
      });
    } finally {
      handleStatusChange({ loading: false });
    }
  };

  const handleSendMessage = async (content: string, files?: any[]) => {
    try {
      handleStatusChange({ loading: true });

      // Controlled mode - delegate message sending to parent or use current conversation ID
      if (isControlled()) {
        const conversationId = props.config?.currentConversationId || props.config?.conversationId;
        if (!conversationId) {
          // Create new conversation in controlled mode if needed
          if (props.onEvents?.onConversationCreate) {
            const newConversationId = await props.onEvents.onConversationCreate({ title: 'New Chat' });
            await chatService().sendMessage(content, files, newConversationId);
            return;
          } else {
            console.error('No conversation ID available and no onConversationCreate handler in controlled mode');
            return;
          }
        }
        await chatService().sendMessage(content, files, conversationId);
        return;
      }

      // Uncontrolled mode
      const store = conversationStore();
      if (!store) return;

      let currentConv = store.currentConversation();
      let conversationId = currentConv?.id || props.config?.conversationId;

      // Lazy conversation creation for new chat mode
      if (!currentConv && props.config?.createOnFirstMessage) {
        try {
          const currentMode = mode();
          if (currentMode === 'remote' || currentMode === 'controlled') {
            // Use createConversationWithMessage for remote storage
            const adapter = storageAdapter();
            if ('createConversationWithMessage' in adapter) {
              conversationId = await (adapter as any).createConversationWithMessage(
                'New Chat',
                content,
                files
              );
            } else {
              // Fallback to regular creation
              conversationId = await store.createConversation('New Chat');
            }
          } else {
            // For local storage, create conversation normally
            conversationId = await store.createConversation('New Chat');
          }

          if (conversationId) {
            await store.loadConversation(conversationId);
            currentConv = store.currentConversation();
            // Refresh conversation list for remote storage
            await store.loadConversations();
          }
        } catch (error) {
          console.error('Failed to create conversation:', error);
          handleStatusChange({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to create conversation'
          });
          return;
        }
      }

      if (!conversationId) {
        console.error('No conversation ID available for sending message');
        handleStatusChange({
          loading: false,
          error: 'No conversation ID available'
        });
        return;
      }

      // Send the message
      await chatService().sendMessage(content, files, conversationId);

      // Update conversation with new messages
      if (currentConv) {
        await store.updateConversation(currentConv.id, {
          messages: chatService().messages()
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      handleStatusChange({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
    } finally {
      handleStatusChange({ loading: false });
    }
  };

  return (
    <ThemeProvider>
      <div class="flex h-screen bg-white">
        {/* Sidebar */}
        <Show when={showConversations() && props.config?.showSidebar !== false}>
          <div class="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <ConversationList
              conversations={sidebarConversations()}
              currentConversationId={(() => {
                if (isControlled()) {
                  return props.config?.currentConversationId || null;
                }
                const store = conversationStore();
                return store?.currentConversationId?.() || null;
              })()}
              onConversationSelect={handleConversationSelect}
              onConversationCreate={handleNewConversation}
              onConversationDelete={async (id: string) => {
                try {
                  if (isControlled() && props.onEvents?.onConversationDelete) {
                    await props.onEvents.onConversationDelete(id);
                  } else {
                    const store = conversationStore();
                    if (store) {
                      await store.deleteConversation(id);
                      if (store.conversations().length > 0) {
                        const firstConv = store.conversations()[0];
                        await handleConversationSelect(firstConv.id);
                      }
                    }
                  }
                } catch (error) {
                  console.error('Failed to delete conversation:', error);
                }
              }}
              onConversationRename={async (id: string, newTitle: string) => {
                try {
                  if (isControlled() && props.onEvents?.onConversationUpdate) {
                    await props.onEvents.onConversationUpdate(id, { title: newTitle });
                  } else {
                    const store = conversationStore();
                    if (store) {
                      await store.updateConversation(id, { title: newTitle });
                    }
                  }
                } catch (error) {
                  console.error('Failed to rename conversation:', error);
                }
              }}
              isLoading={isLoading()}
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
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{props.config?.title || "Nova Chat"}</h1>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{props.config?.description || "Let language become the interface"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          <Show when={errorState()}>
            <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mx-4 mt-4">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-700 dark:text-red-300">{errorState()}</p>
                </div>
                <div class="ml-auto pl-3">
                  <button
                    onClick={() => {
                      chatService().clearMessages();
                      setServiceStatus({ loading: false });
                    }}
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
            messages={chatService().messages()}
            isLoading={isLoading()}
            enableMarkdown={true}
            emptyStateComponent={
              (props.config?.userName || props.config?.suggestions) ? (
                <EmptyState
                  userName={props.config.userName}
                  suggestions={props.config.suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              ) : undefined
            }
          />

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading()}
            enableFileAttachments={true}
            enableMarkdown={true}
            ref={(handle) => messageInputHandle = handle}
          />

          {/* Footer with Disclaimer */}
          <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
            <Show when={props.config?.disclaimerText} fallback={
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
                {props.config?.disclaimerText}
              </p>
            </Show>
          </div>

          {/* Agent State Panel */}
          <StatePanel agentState={chatService().agentState()} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ChatInterface;
