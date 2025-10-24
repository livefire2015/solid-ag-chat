import { createMemo, onMount } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { ConversationDoc, Id } from '../types';

export interface UseConversationListReturn {
  conversations: () => ConversationDoc[];
  activeId: () => Id | undefined;
  load: () => Promise<void>;
  create: (title?: string, metadata?: Record<string, unknown>) => Promise<ConversationDoc>;
  setActive: (id: Id) => void;
  archive: (id: Id) => Promise<void>;
}

export interface UseConversationListOptions {
  autoLoad?: boolean;  // Default: true
}

/**
 * Hook for managing conversation list
 *
 * @example
 * ```tsx
 * const { conversations, activeId, create, setActive } = useConversationList();
 * // Conversations are loaded automatically on mount!
 *
 * // Create a new conversation
 * const handleCreate = async () => {
 *   await create('New Chat');
 * };
 * ```
 */
export function useConversationList(options?: UseConversationListOptions): UseConversationListReturn {
  const ctx = useChatContext();
  const autoLoad = options?.autoLoad !== false;  // Default to true

  // Auto-load conversations on mount
  if (autoLoad) {
    onMount(() => {
      ctx.loadConversations();
    });
  }

  const conversations = createMemo(() => {
    return Object.values(ctx.state.conversations)
      .filter(c => c.status !== 'archived')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  const activeId = createMemo(() => ctx.state.activeConversationId);

  const load = async () => {
    await ctx.loadConversations();
  };

  const create = async (title?: string, metadata?: Record<string, unknown>) => {
    return await ctx.createConversation(title, metadata);
  };

  const setActive = (id: Id) => {
    ctx.setActiveConversation(id);
  };

  const archive = async (id: Id) => {
    await ctx.archiveConversation(id);
  };

  return {
    conversations,
    activeId,
    load,
    create,
    setActive,
    archive,
  };
}
