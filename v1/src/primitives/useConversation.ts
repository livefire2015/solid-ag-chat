import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { MessageDoc, Id } from '../types';

export interface UseConversationReturn {
  messages: () => MessageDoc[];
  isStreaming: () => boolean;
  load: () => Promise<void>;
  send: (text: string, opts?: { attachments?: Id[] }) => Promise<void>;
  cancel: (messageId: Id) => Promise<void>;
}

export function useConversation(id?: Id): UseConversationReturn {
  const ctx = useChatContext();

  const conversationId = createMemo(() => id || ctx.state.activeConversationId);

  const messages = createMemo(() => {
    const cid = conversationId();
    if (!cid) return [];

    const messageIds = ctx.state.messagesByConversation[cid] || [];
    return messageIds
      .map(mid => ctx.state.messages[mid])
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  const isStreaming = createMemo(() => {
    return messages().some(m => m.status === 'streaming');
  });

  const load = async () => {
    const cid = conversationId();
    if (!cid) {
      throw new Error('No conversation ID provided');
    }
    await ctx.loadMessages(cid);
  };

  const send = async (text: string, opts?: { attachments?: Id[] }) => {
    const cid = conversationId();
    if (!cid) {
      throw new Error('No active conversation');
    }

    await ctx.sendMessage(cid, text, {
      attachments: opts?.attachments,
    });
  };

  const cancel = async (messageId: Id) => {
    const cid = conversationId();
    if (!cid) {
      throw new Error('No active conversation');
    }
    await ctx.cancelMessage(cid, messageId);
  };

  return {
    messages,
    isStreaming,
    load,
    send,
    cancel,
  };
}
