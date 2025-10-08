import { createSignal } from 'solid-js';
import type {
  AGUIMessage,
  AGUIEvent,
  AgentState,
  AGUIRequest,
} from './types';

export interface ChatService {
  messages: () => AGUIMessage[];
  isLoading: () => boolean;
  error: () => string | null;
  agentState: () => AgentState | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearAgentState: () => void;
}

export function createAGUIService(apiUrl: string = 'http://localhost:8000/agent/stream'): ChatService {
  const [messages, setMessages] = createSignal<AGUIMessage[]>([], { equals: false });
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [agentState, setAgentState] = createSignal<AgentState | null>(null);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: AGUIMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    let currentAssistantMessage = '';
    let assistantMessageStarted = false;

    try {
      // Send full conversation history (all messages including the new one)
      const allMessages = [...messages(), userMessage];
      const request: AGUIRequest = {
        messages: allMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
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
              case 'TEXT_MESSAGE_CONTENT':
                currentAssistantMessage = event.content;
                if (!assistantMessageStarted) {
                  const assistantMsg: AGUIMessage = {
                    role: 'assistant',
                    content: currentAssistantMessage,
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  assistantMessageStarted = true;
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                      // Create NEW object instead of mutating for SolidJS reactivity
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: currentAssistantMessage
                      };
                    }
                    return updated;
                  });
                }
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
                      role: 'assistant',
                      content: currentAssistantMessage,
                      timestamp: new Date().toISOString(),
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

  return {
    messages,
    isLoading,
    error,
    agentState,
    sendMessage,
    clearMessages,
    clearAgentState,
  };
}
