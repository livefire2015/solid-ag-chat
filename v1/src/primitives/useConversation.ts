import { createMemo, createEffect } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { MessageDoc, Id } from '../types';

export interface UseConversationReturn {
  messages: () => MessageDoc[];
  isStreaming: () => boolean;
  load: () => Promise<void>;
  send: (text: string, opts?: { attachments?: Id[] }) => Promise<void>;
  cancel: (messageId: Id) => Promise<void>;
}

export interface UseConversationOptions {
  autoLoad?: boolean;  // Default: true
}

export function useConversation(
  id?: Id | (() => Id | undefined),
  options?: UseConversationOptions
): UseConversationReturn {
  const ctx = useChatContext();
  const autoLoad = options?.autoLoad !== false;  // Default to true

  const conversationId = createMemo(() => {
    const idValue = typeof id === 'function' ? id() : id;
    return idValue || ctx.state.activeConversationId;
  });

  // Auto-load messages when conversation changes
  if (autoLoad) {
    createEffect(() => {
      const cid = conversationId();
      if (cid) {
        ctx.loadMessages(cid);
      }
    });
  }

  const messages = createMemo(() => {
    const cid = conversationId();
    if (!cid) return [];

    const messageIds = ctx.state.messagesByConversation[cid] || [];
    return messageIds
      .map(mid => ctx.state.messages[mid])
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
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
