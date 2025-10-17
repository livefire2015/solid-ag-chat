import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { ConversationDoc, Id } from '../types';

export interface UseChatReturn {
  conversations: () => ConversationDoc[];
  activeId: () => Id | undefined;
  setActive: (id: Id) => void;
  sendUserMessage: (text: string, opts?: { conversationId?: Id; files?: File[] }) => Promise<void>;
  attachFiles: (files: File[]) => Promise<void>;
  abortGeneration: (messageId?: Id) => Promise<void>;
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
    ctx.send('conversation.select', { conversationId: id });
  };

  const sendUserMessage = async (text: string, opts?: { conversationId?: Id; files?: File[] }) => {
    let conversationId = opts?.conversationId || activeId();

    // If no active conversation, create one
    if (!conversationId) {
      await ctx.send('conversation.create', { title: 'New Chat' });
      conversationId = ctx.state.activeConversationId;
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
      conversationId,
      text,
      attachments: attachmentIds,
    });
  };

  const attachFiles = async (files: File[]) => {
    if (!ctx.upload) {
      throw new Error('Upload function not provided to ChatProvider');
    }
    const attachments = await ctx.upload(files);
    for (const att of attachments) {
      await ctx.send('attachment.register', {
        id: att.id,
        name: att.name,
        mime: att.mime,
        size: att.size,
        url: att.url,
      });
    }
  };

  const abortGeneration = async (messageId?: Id) => {
    await ctx.send('message.abort', { messageId });
  };

  return {
    conversations,
    activeId,
    setActive,
    sendUserMessage,
    attachFiles,
    abortGeneration,
    isConnected: ctx.isConnected,
  };
}
