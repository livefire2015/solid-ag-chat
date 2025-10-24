import { createMemo } from 'solid-js';
import { useChat } from './useChat';
import type { Id, ToolExecution } from '../types';

/**
 * Hook to access and manage pending tool calls
 * Useful for showing a list of tools awaiting execution or for manual tool execution
 */
export function usePendingTools(conversationId?: Id) {
  const store = useChat();

  /**
   * Get all pending tool executions
   */
  const pending = createMemo((): ToolExecution[] => {
    if (!store.toolExecutor) return [];

    const cid = conversationId || store.state.activeConversationId;
    return store.toolExecutor.getPendingExecutions(cid);
  });

  /**
   * Get the next pending tool (FIFO order)
   */
  const next = createMemo(() => {
    const pendingTools = pending();
    return pendingTools.length > 0 ? pendingTools[0] : undefined;
  });

  /**
   * Get count of pending tools
   */
  const count = createMemo(() => pending().length);

  /**
   * Check if there are any pending tools
   */
  const hasPending = createMemo(() => count() > 0);

  /**
   * Get executing tools (subset of pending that are actively running)
   */
  const executing = createMemo(() =>
    pending().filter(t => t.status === 'executing')
  );

  /**
   * Get waiting tools (subset of pending that haven't started yet)
   */
  const waiting = createMemo(() =>
    pending().filter(t => t.status === 'pending')
  );

  return {
    /**
     * All pending tool executions
     */
    pending,

    /**
     * Next tool to be executed
     */
    next,

    /**
     * Number of pending tools
     */
    count,

    /**
     * Whether there are pending tools
     */
    hasPending,

    /**
     * Tools currently executing
     */
    executing,

    /**
     * Tools waiting to execute
     */
    waiting,
  };
}
