import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { MessageDoc, Id } from '../types';

/**
 * Get reactive messages array for a specific conversation
 */
export function useMessages(conversationId?: Id): () => MessageDoc[] {
  const ctx = useChatContext();

  return createMemo(() => {
    const cid = conversationId || ctx.state.activeConversationId;
    if (!cid) return [];

    const messageIds = ctx.state.messagesByConversation[cid] || [];
    return messageIds
      .map(mid => ctx.state.messages[mid])
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });
}
