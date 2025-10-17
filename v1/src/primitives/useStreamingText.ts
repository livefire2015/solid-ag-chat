import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { Id } from '../types';

/**
 * Get current streaming text for a message (if it's streaming)
 */
export function useStreamingText(messageId: Id): () => string {
  const ctx = useChatContext();

  return createMemo(() => {
    const streaming = ctx.state.streaming[messageId];
    return streaming?.text || '';
  });
}
