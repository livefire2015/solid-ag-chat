import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { AgUiClient, Id, ConversationDoc } from '../types';
import type { ChatState } from './state';
import { initStateFromSnapshot, applyNormalizedEvent } from './state';

export interface AgUiStore {
  state: ChatState;
  isConnected: () => boolean;

  // Conversation management
  loadConversations: () => Promise<void>;
  createConversation: (title?: string, metadata?: Record<string, unknown>) => Promise<ConversationDoc>;
  setActiveConversation: (id: Id) => void;
  archiveConversation: (id: Id) => Promise<void>;

  // Message management
  loadMessages: (conversationId: Id) => Promise<void>;
  sendMessage: (conversationId: Id | null, text: string, options?: {
    attachments?: Id[];
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  cancelMessage: (conversationId: Id, messageId: Id) => Promise<void>;

  close: () => void;
}

export function createAgUiStore(client: AgUiClient): AgUiStore {
  // Initialize empty state
  const [state, setState] = createStore<ChatState>({
    revision: '0',
    conversations: {},
    messages: {},
    attachments: {},
    messagesByConversation: {},
    streaming: {},
  });

  const [isConnected, setIsConnected] = createSignal(true); // Always connected in REST mode

  // Subscribe to all normalized events
  client.on('conversation.created', (payload) => {
    const c = (payload as any).conversation;
    setState('conversations', c.id, c);
    setState('activeConversationId', c.id);
  });

  client.on('conversation.updated', (payload) => {
    const c = (payload as any).conversation;
    setState('conversations', c.id, c);
  });

  client.on('conversation.archived', (payload) => {
    const id = (payload as any).conversationId;
    setState('conversations', id, 'status', 'archived');
  });

  client.on('message.created', (payload) => {
    const m = (payload as any).message;
    setState('messages', m.id, m);
    setState('messagesByConversation', m.conversationId, (arr = []) =>
      arr.includes(m.id) ? arr : [...arr, m.id]
    );
  });

  client.on('message.delta', (payload) => {
    const { messageId, textDelta, partDelta } = payload as any;
    if (textDelta) {
      setState('streaming', messageId, (s = { text: '' }) => ({
        text: s.text + textDelta
      }));
    }
    if (partDelta) {
      setState('messages', messageId, 'parts', (parts = []) => [...parts, partDelta]);
    }
  });

  client.on('message.completed', (payload) => {
    const { messageId, usage, parts } = payload as any;

    // Use authoritative parts from payload (AG-UI protocol)
    if (parts && Array.isArray(parts)) {
      setState('messages', messageId, 'parts', parts);
    } else {
      // Fallback: construct from streaming if backend doesn't send parts
      const streamingText = state.streaming[messageId]?.text;
      if (streamingText) {
        setState('messages', messageId, 'parts', (existingParts = []) => {
          const textPart = { kind: 'text', text: streamingText } as any;
          return existingParts.length > 0 ? [textPart, ...existingParts] : [textPart];
        });
      }
    }

    // Clear streaming state
    setState('streaming', messageId, undefined!);
    setState('messages', messageId, 'status', 'completed');
    if (usage) {
      setState('messages', messageId, 'usage', usage);
    }
  });

  client.on('message.errored', (payload) => {
    const { messageId } = payload as any;
    setState('messages', messageId, 'status', 'errored');
  });

  client.on('message.canceled', (payload) => {
    const { messageId } = payload as any;
    setState('messages', messageId, 'status', 'canceled');
  });

  client.on('message.tool_call', (payload) => {
    const { messageId, part } = payload as any;
    setState('messages', messageId, 'parts', (parts = []) => [...parts, part]);
  });

  client.on('message.tool_result', (payload) => {
    const { messageId, part } = payload as any;
    setState('messages', messageId, 'parts', (parts = []) => [...parts, part]);
  });

  client.on('attachment.available', (payload) => {
    const { attachment } = payload as any;
    setState('attachments', attachment.id, attachment);
  });

  client.on('attachment.failed', () => {
    // Optionally track errors
  });

  // Conversation management methods
  const loadConversations = async () => {
    const conversations = await client.listConversations();
    const conversationsMap: Record<string, any> = {};
    conversations.forEach(c => {
      conversationsMap[c.id] = c;
    });
    setState('conversations', conversationsMap);
  };

  const createConversation = async (title?: string, metadata?: Record<string, unknown>) => {
    return await client.createConversation(title, metadata);
  };

  const setActiveConversation = (id: Id) => {
    setState('activeConversationId', id);
  };

  const archiveConversation = async (id: Id) => {
    await client.archiveConversation(id);
  };

  // Message management methods
  const loadMessages = async (conversationId: Id) => {
    const messages = await client.getMessages(conversationId);
    messages.forEach(m => {
      setState('messages', m.id, m);
      setState('messagesByConversation', m.conversationId, (arr = []) =>
        arr.includes(m.id) ? arr : [...arr, m.id]
      );
    });
  };

  const sendMessage = async (
    conversationId: Id | null,
    text: string,
    options?: {
      attachments?: Id[];
      metadata?: Record<string, unknown>;
    }
  ) => {
    await client.sendMessage(conversationId, text, options);
  };

  const cancelMessage = async (conversationId: Id, messageId: Id) => {
    await client.cancelMessage(conversationId, messageId);
  };

  return {
    state,
    isConnected,
    loadConversations,
    createConversation,
    setActiveConversation,
    archiveConversation,
    loadMessages,
    sendMessage,
    cancelMessage,
    close: () => client.close(),
  };
}
