// =============================================================================
// Tool Executor
// Manages tool registration and execution for bidirectional tool flow
// =============================================================================

import type { Tool } from '@ag-ui/core';
import type { ToolHandler, RegisteredTool, ToolExecution, ToolExecutionStatus } from './types';

/**
 * Manages frontend tool registration and execution
 * Implements the bidirectional tool execution pattern from AG-UI:
 * 1. Frontend registers tools with handlers
 * 2. Agent requests tool execution via TOOL_CALL_* events
 * 3. ToolExecutor executes the handler
 * 4. Result is sent back to agent as tool message
 */
export class ToolExecutor {
  private tools = new Map<string, RegisteredTool>();
  private executions = new Map<string, ToolExecution>();
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Register a tool with its handler function
   * @param tool Tool definition (AG-UI Tool interface)
   * @param handler Function to execute when tool is called
   */
  registerTool(tool: Tool, handler: ToolHandler): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, overwriting`);
    }

    this.tools.set(tool.name, { tool, handler });
    this.emit('tool.registered', { toolName: tool.name });
  }

  /**
   * Unregister a tool by name
   */
  unregisterTool(toolName: string): void {
    const removed = this.tools.delete(toolName);
    if (removed) {
      this.emit('tool.unregistered', { toolName });
    }
  }

  /**
   * Get all registered tools (for passing to agent)
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values()).map(rt => rt.tool);
  }

  /**
   * Get a registered tool by name
   */
  getTool(toolName: string): RegisteredTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Execute a tool call
   * @param toolCallId Unique ID for this tool call
   * @param toolName Name of the tool to execute
   * @param args Arguments to pass to the tool
   * @param conversationId Conversation context
   * @param messageId Message context
   * @returns Promise that resolves to the tool result string
   */
  async executeTool(
    toolCallId: string,
    toolName: string,
    args: Record<string, any>,
    conversationId: string,
    messageId: string
  ): Promise<string> {
    const registeredTool = this.tools.get(toolName);

    if (!registeredTool) {
      const error = new Error(`Tool "${toolName}" not found`);
      this.recordExecution(toolCallId, toolName, args, conversationId, messageId, 'failed', undefined, error);
      throw error;
    }

    // Create execution record
    const execution: ToolExecution = {
      toolCallId,
      toolName,
      args,
      conversationId,
      messageId,
      status: 'executing',
      startedAt: Date.now(),
    };

    this.executions.set(toolCallId, execution);
    this.emit('tool.execution.started', { toolCallId, toolName, args });

    try {
      // Execute the handler
      const result = await registeredTool.handler(args);

      // Update execution record
      execution.status = 'completed';
      execution.result = result;
      execution.completedAt = Date.now();

      this.emit('tool.execution.completed', { toolCallId, result });

      return result;
    } catch (error) {
      // Update execution record with error
      execution.status = 'failed';
      execution.error = error instanceof Error ? error : new Error(String(error));
      execution.completedAt = Date.now();

      this.emit('tool.execution.failed', { toolCallId, error: execution.error });

      throw execution.error;
    }
  }

  /**
   * Record a tool execution (for tracking pending/completed tools)
   */
  private recordExecution(
    toolCallId: string,
    toolName: string,
    args: Record<string, any>,
    conversationId: string,
    messageId: string,
    status: ToolExecutionStatus,
    result?: string,
    error?: Error
  ): void {
    const execution: ToolExecution = {
      toolCallId,
      toolName,
      args,
      conversationId,
      messageId,
      status,
      result,
      error,
      startedAt: Date.now(),
      completedAt: status !== 'pending' && status !== 'executing' ? Date.now() : undefined,
    };

    this.executions.set(toolCallId, execution);
  }

  /**
   * Get execution state for a tool call
   */
  getExecution(toolCallId: string): ToolExecution | undefined {
    return this.executions.get(toolCallId);
  }

  /**
   * Get all executions (optionally filtered by conversation)
   */
  getExecutions(conversationId?: string): ToolExecution[] {
    const executions = Array.from(this.executions.values());
    if (conversationId) {
      return executions.filter(e => e.conversationId === conversationId);
    }
    return executions;
  }

  /**
   * Get pending tool calls (not yet executed or in progress)
   */
  getPendingExecutions(conversationId?: string): ToolExecution[] {
    return this.getExecutions(conversationId).filter(
      e => e.status === 'pending' || e.status === 'executing'
    );
  }

  /**
   * Clear execution history (optionally for a specific conversation)
   */
  clearExecutions(conversationId?: string): void {
    if (conversationId) {
      for (const [id, exec] of this.executions.entries()) {
        if (exec.conversationId === conversationId) {
          this.executions.delete(id);
        }
      }
    } else {
      this.executions.clear();
    }
  }

  /**
   * Event emitter for tool execution lifecycle
   */
  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Remove event handler
   */
  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emit event
   */
  private emit(event: string, payload: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in tool executor event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Clean up all registrations and executions
   */
  destroy(): void {
    this.tools.clear();
    this.executions.clear();
    this.eventHandlers.clear();
  }
}
