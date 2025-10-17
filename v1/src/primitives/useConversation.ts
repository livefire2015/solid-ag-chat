import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { MessageDoc, Id } from '../types';

export interface UseConversationReturn {
  messages: () => MessageDoc[];
  isStreaming: () => boolean;
  send: (text: string, opts?: { files?: File[] }) => Promise<void>;
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

  const send = async (text: string, opts?: { files?: File[] }) => {
    const cid = conversationId();
    if (!cid) {
      throw new Error('No active conversation');
    }

    // Handle file uploads if provided
    let attachmentIds: Id[] = [];
    if (opts?.files && opts.files.length > 0 && ctx.upload) {
      const attachments = await ctx.upload(opts.files);
      attachmentIds = attachments.map(a => a.id);
      // Register attachments with backend
      for (const att of attachments) {
        await ctx.send('attachment.register', {
          id: att.id,
          name: att.name,
          mime: att.mime,
          size: att.size,
          url: att.url,
        });
      }
    }

    // Send message
    await ctx.send('message.send', {
      clientMessageId: crypto.randomUUID(),
      conversationId: cid,
      text,
      attachments: attachmentIds,
    });
  };

  return {
    messages,
    isStreaming,
    send,
  };
}
