import { createSignal, createEffect } from 'solid-js';
import type {
  Conversation,
  ConversationSummary,
  EnhancedAGUIMessage,
  StorageAdapter,
  ChatEvent,
  EventCallback
} from '../services/types';
import { StorageManager } from '../services/storage';

export interface ConversationStore {
  // State getters
  conversations: () => ConversationSummary[];
  currentConversation: () => Conversation | null;
  currentConversationId: () => string | null;
  isLoading: () => boolean;
  error: () => string | null;
  searchQuery: () => string;
  filterTags: () => string[];

  // Actions
  createConversation: (title?: string, initialMessage?: string) => Promise<string>;
  loadConversation: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  duplicateConversation: (conversationId: string) => Promise<string>;

  // Message management
  addMessage: (message: Omit<EnhancedAGUIMessage, 'id' | 'conversationId'>) => void;
  updateMessage: (messageId: string, updates: Partial<EnhancedAGUIMessage>) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;

  // Search and filtering
  setSearchQuery: (query: string) => void;
  setFilterTags: (tags: string[]) => void;
  searchMessages: (query: string, conversationId?: string) => Promise<EnhancedAGUIMessage[]>;

  // Conversation management
  archiveConversation: (conversationId: string) => Promise<void>;
  starConversation: (conversationId: string) => Promise<void>;
  addTagToConversation: (conversationId: string, tag: string) => Promise<void>;
  removeTagFromConversation: (conversationId: string, tag: string) => Promise<void>;

  // Bulk operations
  clearAllConversations: () => Promise<void>;
  exportConversations: () => Promise<any>;
  importConversations: (data: any) => Promise<void>;

  // Event system
  addEventListener: (type: string, callback: EventCallback) => void;
  removeEventListener: (type: string, callback: EventCallback) => void;

  // Utility
  generateTitle: (messages: EnhancedAGUIMessage[]) => string;
  getConversationStats: () => { total: number; archived: number; starred: number };
  cleanup: (maxAge?: number) => Promise<void>;
}

export function createConversationStore(storageManager: StorageManager, autoLoad: boolean = true): ConversationStore {
  // Reactive state
  const [conversations, setConversations] = createSignal<ConversationSummary[]>([]);
  const [currentConversation, setCurrentConversation] = createSignal<Conversation | null>(null);
  const [currentConversationId, setCurrentConversationId] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [filterTags, setFilterTags] = createSignal<string[]>([]);

  // Event system
  const eventListeners = new Map<string, EventCallback[]>();

  const emitEvent = (type: string, payload?: unknown) => {
    const listeners = eventListeners.get(type) || [];
    const event: ChatEvent = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    listeners.forEach(callback => callback(event));
  };

  const addEventListener = (type: string, callback: EventCallback) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, []);
    }
    eventListeners.get(type)!.push(callback);
  };

  const removeEventListener = (type: string, callback: EventCallback) => {
    const listeners = eventListeners.get(type) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };

  // Generate conversation title from messages
  const generateTitle = (messages: EnhancedAGUIMessage[]): string => {
    if (messages.length === 0) return 'New Conversation';

    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      if (content.length > 50) {
        return content.substring(0, 47) + '...';
      }
      return content || 'New Conversation';
    }

    return 'New Conversation';
  };

  // Load conversations from storage
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaries = await storageManager.getAllConversationSummaries();
      setConversations(summaries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize by loading conversations (only if autoLoad is true)
  if (autoLoad) {
    loadConversations();
  }

  // Create new conversation
  const createConversation = async (title?: string, initialMessage?: string): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const messages: EnhancedAGUIMessage[] = [];

      if (initialMessage) {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        messages.push({
          id: messageId,
          conversationId,
          role: 'user',
          content: initialMessage,
          timestamp: now,
          isMarkdown: false,
          isEdited: false
        });
      }

      const conversation: Conversation = {
        id: conversationId,
        title: title || generateTitle(messages),
        messages,
        createdAt: now,
        updatedAt: now,
        tags: [],
        archived: false,
        starred: false
      };

      await storageManager.saveConversation(conversation);
      await loadConversations();

      emitEvent('conversationCreated', conversation);
      return conversationId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Load specific conversation
  const loadConversation = async (conversationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const conversation = await storageManager.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      setCurrentConversation(conversation);
      setCurrentConversationId(conversationId);
      emitEvent('conversationLoaded', conversation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      setCurrentConversation(null);
      setCurrentConversationId(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update conversation
  const updateConversation = async (conversationId: string, updates: Partial<Conversation>): Promise<void> => {
    try {
      const conversation = await storageManager.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const updatedConversation = {
        ...conversation,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await storageManager.saveConversation(updatedConversation);

      if (currentConversationId() === conversationId) {
        setCurrentConversation(updatedConversation);
      }

      await loadConversations();
      emitEvent('conversationUpdated', updatedConversation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation';
      setError(errorMessage);
      throw err;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string): Promise<void> => {
    try {
      await storageManager.deleteConversation(conversationId);

      if (currentConversationId() === conversationId) {
        setCurrentConversation(null);
        setCurrentConversationId(null);
      }

      await loadConversations();
      emitEvent('conversationDeleted', { conversationId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      throw err;
    }
  };

  // Duplicate conversation
  const duplicateConversation = async (conversationId: string): Promise<string> => {
    try {
      const conversation = await storageManager.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create new messages with new IDs
      const newMessages: EnhancedAGUIMessage[] = conversation.messages.map((msg: EnhancedAGUIMessage) => ({
        ...msg,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId: newConversationId
      }));

      const newConversation: Conversation = {
        ...conversation,
        id: newConversationId,
        title: `${conversation.title} (Copy)`,
        messages: newMessages,
        createdAt: now,
        updatedAt: now,
        starred: false
      };

      await storageManager.saveConversation(newConversation);
      await loadConversations();

      emitEvent('conversationDuplicated', { original: conversation, duplicate: newConversation });
      return newConversationId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate conversation';
      setError(errorMessage);
      throw err;
    }
  };

  // Add message to current conversation
  const addMessage = (message: Omit<EnhancedAGUIMessage, 'id' | 'conversationId'>) => {
    const current = currentConversation();
    if (!current) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: EnhancedAGUIMessage = {
      ...message,
      id: messageId,
      conversationId: current.id,
      timestamp: message.timestamp || new Date().toISOString()
    };

    const updatedConversation = {
      ...current,
      messages: [...current.messages, newMessage],
      updatedAt: new Date().toISOString()
    };

    setCurrentConversation(updatedConversation);

    // Auto-save to storage
    storageManager.saveConversation(updatedConversation).then(() => {
      loadConversations();
    });

    emitEvent('messageAdded', newMessage);
  };

  // Update message
  const updateMessage = (messageId: string, updates: Partial<EnhancedAGUIMessage>) => {
    const current = currentConversation();
    if (!current) return;

    const updatedMessages = current.messages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );

    const updatedConversation = {
      ...current,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    setCurrentConversation(updatedConversation);

    // Auto-save to storage
    storageManager.saveConversation(updatedConversation).then(() => {
      loadConversations();
    });

    emitEvent('messageUpdated', { messageId, updates });
  };

  // Delete message
  const deleteMessage = (messageId: string) => {
    const current = currentConversation();
    if (!current) return;

    const updatedMessages = current.messages.filter(msg => msg.id !== messageId);
    const updatedConversation = {
      ...current,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    setCurrentConversation(updatedConversation);

    // Auto-save to storage
    storageManager.saveConversation(updatedConversation).then(() => {
      loadConversations();
    });

    emitEvent('messageDeleted', { messageId });
  };

  // Edit message
  const editMessage = (messageId: string, newContent: string) => {
    updateMessage(messageId, {
      content: newContent,
      isEdited: true,
      editedAt: new Date().toISOString()
    });
  };

  // Search messages
  const searchMessages = async (query: string, conversationId?: string): Promise<EnhancedAGUIMessage[]> => {
    const lowerQuery = query.toLowerCase();
    const results: EnhancedAGUIMessage[] = [];

    if (conversationId) {
      const conversation = await storageManager.getConversation(conversationId);
      if (conversation) {
        results.push(
          ...conversation.messages.filter((msg: EnhancedAGUIMessage) =>
            msg.content.toLowerCase().includes(lowerQuery)
          )
        );
      }
    } else {
      const summaries = await storageManager.getAllConversationSummaries();
      for (const summary of summaries) {
        const conversation = await storageManager.getConversation(summary.id);
        if (conversation) {
          results.push(
            ...conversation.messages.filter((msg: EnhancedAGUIMessage) =>
              msg.content.toLowerCase().includes(lowerQuery)
            )
          );
        }
      }
    }

    return results;
  };

  // Archive conversation
  const archiveConversation = async (conversationId: string): Promise<void> => {
    await updateConversation(conversationId, { archived: true });
  };

  // Star conversation
  const starConversation = async (conversationId: string): Promise<void> => {
    const conversation = await storageManager.getConversation(conversationId);
    if (conversation) {
      await updateConversation(conversationId, { starred: !conversation.starred });
    }
  };

  // Add tag to conversation
  const addTagToConversation = async (conversationId: string, tag: string): Promise<void> => {
    const conversation = await storageManager.getConversation(conversationId);
    if (conversation) {
      const tags = conversation.tags || [];
      if (!tags.includes(tag)) {
        await updateConversation(conversationId, { tags: [...tags, tag] });
      }
    }
  };

  // Remove tag from conversation
  const removeTagFromConversation = async (conversationId: string, tag: string): Promise<void> => {
    const conversation = await storageManager.getConversation(conversationId);
    if (conversation) {
      const tags = conversation.tags || [];
      await updateConversation(conversationId, { tags: tags.filter((t: string) => t !== tag) });
    }
  };

  // Clear all conversations
  const clearAllConversations = async (): Promise<void> => {
    try {
      const summaries = await storageManager.getAllConversationSummaries();
      await Promise.all(summaries.map(summary => storageManager.deleteConversation(summary.id)));

      setConversations([]);
      setCurrentConversation(null);
      setCurrentConversationId(null);

      emitEvent('allConversationsCleared', null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear conversations';
      setError(errorMessage);
      throw err;
    }
  };

  // Export conversations
  const exportConversations = async (): Promise<any> => {
    return await storageManager.exportData();
  };

  // Import conversations
  const importConversations = async (data: any): Promise<void> => {
    await storageManager.importData(data);
    await loadConversations();
    emitEvent('conversationsImported', data);
  };

  // Get conversation statistics
  const getConversationStats = () => {
    const convs = conversations();
    return {
      total: convs.length,
      archived: convs.filter(c => c.archived).length,
      starred: convs.filter(c => c.starred).length
    };
  };

  // Cleanup old conversations
  const cleanup = async (maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> => {
    await storageManager.cleanup(maxAge);
    await loadConversations();
  };

  return {
    // State getters
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    error,
    searchQuery,
    filterTags,

    // Actions
    createConversation,
    loadConversation,
    loadConversations,
    updateConversation,
    deleteConversation,
    duplicateConversation,

    // Message management
    addMessage,
    updateMessage,
    deleteMessage,
    editMessage,

    // Search and filtering
    setSearchQuery,
    setFilterTags,
    searchMessages,

    // Conversation management
    archiveConversation,
    starConversation,
    addTagToConversation,
    removeTagFromConversation,

    // Bulk operations
    clearAllConversations,
    exportConversations,
    importConversations,

    // Event system
    addEventListener,
    removeEventListener,

    // Utility
    generateTitle,
    getConversationStats,
    cleanup
  };
}