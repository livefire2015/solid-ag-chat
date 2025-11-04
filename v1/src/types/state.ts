/**
 * Shared state types matching backend Pydantic models.
 * These types define the contract between frontend and backend via AG-UI protocol.
 */

export interface SuggestedQuestions {
  /** List of AI-generated follow-up questions */
  questions: string[];
}

export interface ChatAgentState {
  /** Suggested follow-up questions from the agent */
  suggestedQuestions?: SuggestedQuestions;

  /** Attachments associated with this conversation */
  attachments?: Record<string, any>;

  // Future state fields
  // selectedModel?: string;
  // conversationMode?: 'normal' | 'creative' | 'precise';
}

/** Mapping of conversation ID to agent state */
export type AgentStateMap = Record<string, ChatAgentState>;
