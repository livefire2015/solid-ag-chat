import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { ConversationDoc, Id } from '../types';

export interface UseChatReturn {
  conversations: () => ConversationDoc[];
  activeId: () => Id | undefined;
  setActive: (id: Id) => void;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<ConversationDoc>;
  sendMessage: (conversationId: Id | null, text: string, opts?: { attachments?: Id[] }) => Promise<void>;
  cancelMessage: (conversationId: Id, messageId: Id) => Promise<void>;
  isConnected: () => boolean;
}

export function useChat(): UseChatReturn {
  const ctx = useChatContext();

  const conversations = createMemo(() => {
    return Object.values(ctx.state.conversations).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  const activeId = createMemo(() => ctx.state.activeConversationId);

  const setActive = (id: Id) => {
    ctx.setActiveConversation(id);
  };

  const loadConversations = async () => {
    await ctx.loadConversations();
  };

  const createConversation = async (title?: string) => {
    return await ctx.createConversation(title);
  };

  const sendMessage = async (
    conversationId: Id | null,
    text: string,
    opts?: { attachments?: Id[] }
  ) => {
    await ctx.sendMessage(conversationId, text, {
      attachments: opts?.attachments,
    });
  };

  const cancelMessage = async (conversationId: Id, messageId: Id) => {
    await ctx.cancelMessage(conversationId, messageId);
  };

  return {
    conversations,
    activeId,
    setActive,
    loadConversations,
    createConversation,
    sendMessage,
    cancelMessage,
    isConnected: ctx.isConnected,
  };
}
