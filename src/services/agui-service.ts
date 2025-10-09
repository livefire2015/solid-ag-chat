import { createSignal } from 'solid-js';
import type {
  AGUIMessage,
  EnhancedAGUIMessage,
  AGUIEvent,
  AgentState,
  AGUIRequest,
} from './types';

export interface ChatService {
  messages: () => EnhancedAGUIMessage[];
  isLoading: () => boolean;
  error: () => string | null;
  agentState: () => AgentState | null;
  sendMessage: (message: string, attachments?: File[]) => Promise<void>;
  clearMessages: () => void;
  clearAgentState: () => void;
  loadMessages: (messages: EnhancedAGUIMessage[]) => void;
}

export function createAGUIService(apiUrl: string = 'http://localhost:8000/agent/stream'): ChatService {
  const [messages, setMessages] = createSignal<EnhancedAGUIMessage[]>([], { equals: false });
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [agentState, setAgentState] = createSignal<AgentState | null>(null);
  // Persistent threadId for the entire conversation
  const [threadId] = createSignal(crypto.randomUUID());

  const sendMessage = async (message: string, attachments?: File[]) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: EnhancedAGUIMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: 'default', // For now, using default conversation
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isMarkdown: false,
      isEdited: false,
    };
    setMessages((prev) => [...prev, userMessage]);

    let currentAssistantMessage = '';
    let assistantMessageStarted = false;

    try {
      // Send full conversation history (all messages including the new one)
      const allMessages = [...messages(), userMessage];
      const request: AGUIRequest = {
        threadId: threadId(), // Persistent thread ID for conversation
        runId: crypto.randomUUID(), // New run ID for each message
        state: null,
        messages: allMessages.map(msg => ({
          id: crypto.randomUUID(), // Generate unique ID for each message
          role: msg.role,
          content: msg.content,
        })),
        tools: [],
        context: [],
        forwardedProps: null,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = line.slice(6); // Remove 'data: ' prefix
            if (data === '[DONE]') continue;

            const event: AGUIEvent = JSON.parse(data);

            // Handle different event types
            switch (event.type) {
              case 'TEXT_MESSAGE_START':
                // Initialize new assistant message
                if (!assistantMessageStarted) {
                  const assistantMsg: EnhancedAGUIMessage = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    conversationId: 'default',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isMarkdown: true, // Assistant messages are typically markdown
                    isEdited: false,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  assistantMessageStarted = true;
                  currentAssistantMessage = '';
                }
                break;

              case 'TEXT_MESSAGE_CONTENT':
                currentAssistantMessage += event.delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: currentAssistantMessage
                    };
                  }
                  return updated;
                });
                break;

              case 'TEXT_MESSAGE_END':
                // Message is complete
                console.log('Message ended:', currentAssistantMessage);
                break;

              case 'TEXT_MESSAGE_DELTA':
                currentAssistantMessage += event.delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;

                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    // Create NEW object instead of mutating for SolidJS reactivity
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: currentAssistantMessage
                    };
                  } else {
                    updated.push({
                      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      conversationId: 'default',
                      role: 'assistant',
                      content: currentAssistantMessage,
                      timestamp: new Date().toISOString(),
                      isMarkdown: true,
                      isEdited: false,
                    });
                    assistantMessageStarted = true;
                  }
                  return updated;
                });
                break;

              case 'STATE_SNAPSHOT':
                setAgentState(event.state);
                break;

              case 'STATE_DELTA':
                setAgentState((prev) => ({
                  ...prev,
                  ...event.delta,
                }));
                break;

              case 'ERROR':
                setError(event.error);
                break;

              case 'RUN_STARTED':
              case 'RUN_FINISHED':
              case 'TOOL_CALL_START':
              case 'TOOL_CALL_END':
              case 'TOOL_OUTPUT':
                // Handle these events if needed
                console.log('Event:', event);
                break;
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', parseError);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  const clearAgentState = () => {
    setAgentState(null);
  };

  const loadMessages = (newMessages: EnhancedAGUIMessage[]) => {
    setMessages(newMessages);
    setError(null);
  };

  return {
    messages,
    isLoading,
    error,
    agentState,
    sendMessage,
    clearMessages,
    clearAgentState,
    loadMessages,
  };
}
