/**
 * Hook for accessing and interacting with suggested follow-up questions.
 * Provides reactive access to questions and utilities for handling them.
 */

import { createMemo, createEffect, onCleanup } from 'solid-js';
import { useChatContext } from './ChatProvider';
import type { Id } from '../types';

export interface UseSuggestedQuestionsOptions {
  /** Auto-clear questions when conversation changes */
  autoClear?: boolean;
  /** Callback when questions are updated */
  onQuestionsUpdate?: (questions: string[]) => void;
}

export interface UseSuggestedQuestionsReturn {
  /** Current suggested questions */
  questions: () => string[];
  /** Whether there are any questions available */
  hasQuestions: () => boolean;
  /** Send a suggested question as a new message */
  sendQuestion: (question: string) => Promise<void>;
}

/**
 * Access suggested follow-up questions for a conversation.
 *
 * @example
 * ```tsx
 * const { questions, sendQuestion } = useSuggestedQuestions(
 *   () => activeConversationId()
 * );
 *
 * <For each={questions()}>
 *   {(q) => <button onClick={() => sendQuestion(q)}>{q}</button>}
 * </For>
 * ```
 */
export function useSuggestedQuestions(
  conversationId: () => Id | undefined,
  options: UseSuggestedQuestionsOptions = {}
): UseSuggestedQuestionsReturn {
  const ctx = useChatContext();
  const { autoClear = true, onQuestionsUpdate } = options;

  // Reactive access to questions
  const questions = createMemo(() => {
    const convId = conversationId();
    if (!convId) return [];

    const agentState = ctx.state.agentStateByConversation[convId];
    return agentState?.suggestedQuestions?.questions || [];
  });

  const hasQuestions = createMemo(() => questions().length > 0);

  // Handle question updates
  createEffect(() => {
    const q = questions();
    if (onQuestionsUpdate) {
      onQuestionsUpdate(q);
    }
  });

  // Send a suggested question as new message
  const sendQuestion = async (question: string) => {
    const convId = conversationId();
    if (!convId) {
      console.warn('[useSuggestedQuestions] No conversation ID to send question to');
      return;
    }

    // Send as regular message
    await ctx.sendMessage(convId, question);

    // Note: Agent will provide new suggestions with its response automatically
    // Questions are managed server-side and synced via STATE_SNAPSHOT events
  };

  return {
    questions,
    hasQuestions,
    sendQuestion,
  };
}
