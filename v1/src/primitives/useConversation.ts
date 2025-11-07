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
    console.log('[useConversation.messages] 🔍 Querying for conversationId:', cid);
    if (!cid) return [];

    // CRITICAL: Access the entire messagesByConversation object first to establish tracking
    // This ensures SolidJS tracks changes to the object before accessing the specific key
    const allConversations = ctx.state.messagesByConversation;
    console.log('[useConversation.messages] 🔍 allConversations keys:', Object.keys(allConversations));

    // Now access the specific conversation's messages
    const messageIds = allConversations[cid] ?? [];
    console.log('[useConversation.messages] 🔍 messageIds from state:', messageIds);
    console.log('[useConversation.messages] 🔍 messageIds length:', messageIds.length);

    // Map to actual message objects - access entire messages object first for tracking
    const allMessages = ctx.state.messages;
    const mappedMessages = messageIds
      .map(mid => {
        const msg = allMessages[mid];
        return msg;
      })
      .filter(Boolean);
    console.log('[useConversation.messages] mapped message count:', mappedMessages.length);
    console.log('[useConversation.messages] mapped message IDs:', mappedMessages.map(m => m.id));

    const sorted = mappedMessages.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    console.log('[useConversation.messages] final sorted count:', sorted.length);

    return sorted;
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

    console.log('[useConversation.send] Called with text:', text, 'conversationId:', cid);

    // Allow sending without conversation (will auto-create via SDK)
    await ctx.sendMessage(cid || null, text, {
      attachments: opts?.attachments,
    });

    console.log('[useConversation.send] Completed');
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
