import { createMemo } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { ToolExecution } from '../types';

/**
 * Hook to monitor the execution state of a specific tool call
 * Useful for showing loading indicators, results, or errors in the UI
 */
export function useToolExecution(toolCallId: string) {
  const store = useChatContext();

  /**
   * Get the execution record for this tool call
   */
  const execution = createMemo((): ToolExecution | undefined => {
    if (!store.toolExecutor) return undefined;
    return store.toolExecutor.getExecution(toolCallId);
  });

  /**
   * Current status of the tool execution
   */
  const status = createMemo(() => execution()?.status);

  /**
   * Check if tool is currently executing
   */
  const isExecuting = createMemo(() => status() === 'executing');

  /**
   * Check if tool execution is pending
   */
  const isPending = createMemo(() => status() === 'pending');

  /**
   * Check if tool execution is completed
   */
  const isCompleted = createMemo(() => status() === 'completed');

  /**
   * Check if tool execution failed
   */
  const isFailed = createMemo(() => status() === 'failed');

  /**
   * Get the tool result (if completed)
   */
  const result = createMemo(() => execution()?.result);

  /**
   * Get the error (if failed)
   */
  const error = createMemo(() => execution()?.error);

  /**
   * Get execution duration in milliseconds
   */
  const duration = createMemo(() => {
    const exec = execution();
    if (!exec?.startedAt) return undefined;
    if (!exec.completedAt) return Date.now() - exec.startedAt;
    return exec.completedAt - exec.startedAt;
  });

  return {
    /**
     * Full execution record
     */
    execution,

    /**
     * Current execution status
     */
    status,

    /**
     * Status flags
     */
    isExecuting,
    isPending,
    isCompleted,
    isFailed,

    /**
     * Result data
     */
    result,
    error,

    /**
     * Timing information
     */
    duration,
  };
}
