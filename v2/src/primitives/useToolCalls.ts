import { createMemo } from 'solid-js';
import { useChat } from './useChat';
import type { Id, ToolExecution } from '../types';
import type { ToolCall } from '@ag-ui/core';

/**
 * Hook to access tool calls for a conversation
 * Returns both tool calls in messages and execution state
 */
export function useToolCalls(conversationId?: Id) {
  const store = useChat();

  /**
   * Get all tool calls from messages in this conversation
   */
  const toolCalls = createMemo(() => {
    const cid = conversationId || store.state.activeConversationId;
    if (!cid) return [];

    const messageIds = store.state.messagesByConversation[cid] || [];
    const calls: Array<ToolCall & { messageId: string; conversationId: string }> = [];

    for (const msgId of messageIds) {
      const msg = store.state.messages[msgId];
      if (msg?.toolCalls) {
        for (const tc of msg.toolCalls) {
          calls.push({
            ...tc,
            messageId: msgId,
            conversationId: cid,
          });
        }
      }
    }

    return calls;
  });

  /**
   * Get tool executions from the tool executor
   */
  const executions = createMemo((): ToolExecution[] => {
    if (!store.toolExecutor) return [];

    const cid = conversationId || store.state.activeConversationId;
    if (!cid) return store.toolExecutor.getExecutions();

    return store.toolExecutor.getExecutions(cid);
  });

  /**
   * Get pending tool executions (not yet completed)
   */
  const pendingExecutions = createMemo(() => {
    if (!store.toolExecutor) return [];

    const cid = conversationId || store.state.activeConversationId;
    return store.toolExecutor.getPendingExecutions(cid);
  });

  /**
   * Get tool calls in progress (currently accumulating arguments)
   */
  const toolCallsInProgress = createMemo(() => {
    const cid = conversationId || store.state.activeConversationId;
    if (!cid) return [];

    return Object.values(store.state.toolCallsInProgress).filter(
      tc => {
        const msg = store.state.messages[tc.messageId];
        return msg?.conversationId === cid;
      }
    );
  });

  return {
    /**
     * All completed tool calls from messages
     */
    toolCalls,

    /**
     * All tool executions (from ToolExecutor)
     */
    executions,

    /**
     * Pending tool executions (being executed or waiting)
     */
    pendingExecutions,

    /**
     * Tool calls currently being streamed (args accumulating)
     */
    toolCallsInProgress,

    /**
     * Check if there are any pending tools
     */
    hasPendingTools: createMemo(() => pendingExecutions().length > 0),

    /**
     * Check if there are any tool calls in progress
     */
    hasToolCallsInProgress: createMemo(() => toolCallsInProgress().length > 0),
  };
}
