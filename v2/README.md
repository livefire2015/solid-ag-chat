# @livefire2015/solid-ag-chat v2

**SolidJS library** for building chat UIs with official **AG-UI protocol** support and **bidirectional tool execution**.

[![npm version](https://badge.fury.io/js/@livefire2015%2Fsolid-ag-chat.svg)](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What's New in V2

🎉 **Bidirectional Tool Execution** - Frontend-defined tools with automatic execution:
- 🔧 **Frontend Tool Registration** - Define tools with handlers in your React components
- ⚡ **Automatic Execution** - Tools execute automatically when agent requests them
- 🔄 **Resume on Result** - Agent continues after tool execution completes
- 📊 **Execution Tracking** - Monitor tool state with reactive hooks
- 🎯 **Human-in-the-Loop** - Perfect for user confirmations, data fetching, UI navigation

## What This Library Provides

This is a **library** - not a ready-to-use chat UI. It provides:
- ✅ **SolidJS Primitives** - Provider, hooks for building custom chat UIs
- ✅ **Official AG-UI SDK Client** - Stateless agent execution with streaming
- ✅ **Bidirectional Tool Execution** - Frontend tools with automatic execution (V2)
- ✅ **Reactive State Management** - Client-side state with conversation context
- ✅ **Type Safety** - Full TypeScript types for AG-UI protocol
- ✅ **Mock Client** - Testing infrastructure included

**You build the UI** - This library handles the protocol, state, reactivity, and tool execution.

## AG-UI Protocol Overview

AG-UI is a **stateless agent protocol** using the official `@ag-ui/client` SDK:

```
┌─────────────┐    RxJS Observable     ┌─────────────┐
│   Browser   │◄───────────────────────│   Server    │
│   Client    │     /agent/run         │  (Python)   │
│  (SolidJS)  │───────────────────────►│ (PydanticAI)│
└─────────────┘                        └─────────────┘
```

**Key Features:**
- 📨 **Stateless Execution**: Client sends full conversation history with each request
- 🔄 **Streaming Events**: TEXT_MESSAGE_START/CONTENT/END, TOOL_CALL_*, etc.
- 🛠️ **Tool Calls**: Official `toolCalls` array in messages
- 💬 **Conversation Management**: Client-side multi-turn context tracking

## Installation

```bash
npm install @livefire2015/solid-ag-chat
```

Peer dependencies:
- `solid-js@^1.8.0`
- `@ag-ui/core@^0.0.39`
- `@ag-ui/client@^0.0.39`
- `rxjs@^7.8.1`

## Quick Start

### 1. Wrap Your App with ChatProvider

```tsx
import { ChatProvider, createSdkAgent } from '@livefire2015/solid-ag-chat';

function App() {
  // Create official AG-UI SDK client
  const client = createSdkAgent({
    baseUrl: 'http://localhost:8000',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'  // Optional auth
    },
    agentEndpoint: '/agent/run',              // Default: /agent/run
    conversationsEndpoint: '/conversations'    // Default: /conversations
  });

  return (
    <ChatProvider client={client}>
      <YourChatUI />
    </ChatProvider>
  );
}
```

### 2. Build Your UI with Hooks

```tsx
import { useConversationList, useConversation } from '@livefire2015/solid-ag-chat';
import { For, onMount } from 'solid-js';

function YourChatUI() {
  // Manage conversation list
  const {
    conversations,
    activeId,
    load,
    create,
    setActive
  } = useConversationList();

  // Work with active conversation
  const { messages, isStreaming, send } = useConversation();

  // Load conversations on mount
  onMount(() => load());

  return (
    <div class="flex h-screen">
      {/* Conversation List */}
      <aside class="w-64 border-r">
        <button onClick={() => create('New Chat')}>+ New Chat</button>
        <For each={conversations()}>
          {conv => (
            <button
              onClick={() => setActive(conv.id)}
              class={activeId() === conv.id ? 'active' : ''}
            >
              {conv.title}
            </button>
          )}
        </For>
      </aside>

      {/* Messages */}
      <main class="flex-1 flex flex-col">
        <div class="flex-1 overflow-auto">
          <For each={messages()}>
            {msg => (
              <div class={`message ${msg.role}`}>
                {/* Text content */}
                {msg.content && <p>{msg.content}</p>}

                {/* Tool calls */}
                {msg.toolCalls && (
                  <For each={msg.toolCalls}>
                    {tc => (
                      <div class="tool-call">
                        🔧 {tc.function.name}({tc.function.arguments})
                      </div>
                    )}
                  </For>
                )}
              </div>
            )}
          </For>
          {isStreaming() && <div class="typing-indicator">...</div>}
        </div>

        {/* Input */}
        <form onSubmit={e => {
          e.preventDefault();
          const input = e.target.elements.message;
          send(input.value);  // Sends to /agent/run with conversation history
          input.value = '';
        }}>
          <input name="message" placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  );
}
```

## Bidirectional Tool Execution (V2)

V2 introduces **frontend-defined tools** that execute automatically when the agent requests them.

### How It Works

1. **Define Tools** in ChatProvider with handler functions
2. **Agent Requests Tool** via TOOL_CALL_START/ARGS/END events
3. **Frontend Executes** tool handler automatically
4. **Result Sent Back** to agent as tool message
5. **Agent Resumes** execution with the tool result

### Example: User Confirmation Tool

```tsx
import { ChatProvider, createSdkAgent } from '@livefire2015/solid-ag-chat';
import type { ToolHandler, RegisteredTool } from '@livefire2015/solid-ag-chat';

function App() {
  const client = createSdkAgent({ baseUrl: 'http://localhost:8000' });

  // Define a confirmation tool
  const confirmActionTool: RegisteredTool = {
    tool: {
      name: 'confirmAction',
      description: 'Ask the user to confirm a specific action before proceeding',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'The action that needs user confirmation'
          },
          importance: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'The importance level of the action'
          }
        },
        required: ['action']
      }
    },
    handler: async (args) => {
      // Show confirmation dialog to user
      const confirmed = window.confirm(`Confirm: ${args.action}?`);
      return confirmed ? 'approved' : 'rejected';
    }
  };

  return (
    <ChatProvider client={client} tools={[confirmActionTool]}>
      <YourChatUI />
    </ChatProvider>
  );
}
```

### Tool Registration Patterns

**Provider-Level Tools** (Available to all conversations):

```tsx
<ChatProvider client={client} tools={[tool1, tool2]}>
  <App />
</ChatProvider>
```

**Per-Message Tools** (Additive to provider tools):

```tsx
const { send } = useConversation();

// Send with additional tools
await send('Deploy to production', {
  tools: [deploymentTool]  // Merged with provider tools
});
```

### Tool Execution Hooks

Monitor tool execution state in your UI:

```tsx
import { useToolCalls, useToolExecution, usePendingTools } from '@livefire2015/solid-ag-chat';

function ToolMonitor() {
  // Get all tool calls for current conversation
  const { toolCalls, pendingExecutions, hasPendingTools } = useToolCalls();

  // Monitor specific tool execution
  const { status, result, error, isExecuting } = useToolExecution(toolCallId);

  // Get pending tools queue
  const { pending, next, count } = usePendingTools();

  return (
    <Show when={hasPendingTools()}>
      <div class="tool-status">
        Executing {count()} tools...
      </div>
    </Show>
  );
}
```

### Complete Example: Data Fetching Tool

```tsx
const userDataTool: RegisteredTool = {
  tool: {
    name: 'fetchUserData',
    description: 'Retrieve data about a specific user',
    parameters: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'ID of the user to fetch'
        }
      },
      required: ['userId']
    }
  },
  handler: async (args) => {
    const response = await fetch(`/api/users/${args.userId}`);
    const data = await response.json();
    return JSON.stringify(data);
  }
};
```

## API Reference

### ChatProvider

Provides AG-UI client and reactive state to all children.

```typescript
interface ChatProviderProps {
  client: AgUiClient;              // Required: AG-UI client instance
  tools?: RegisteredTool[];        // V2: Provider-level tools (optional)
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;  // Optional: file upload handler
  sessionId?: string;              // Optional: session identifier
  initialConversationId?: string;  // Optional: initial conversation to load
  children: JSX.Element;
}
```

**Example:**

```tsx
<ChatProvider
  client={createSdkAgent({ baseUrl: 'http://localhost:8000' })}
  upload={async (files) => {
    // Upload files to your server
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch('/upload', { method: 'POST', body: formData });
    return res.json();
  }}
>
  <App />
</ChatProvider>
```

### useConversationList()

Hook for managing the conversation list.

```typescript
interface UseConversationListReturn {
  conversations: () => ConversationDoc[];     // Reactive conversation list
  activeId: () => Id | undefined;             // Current conversation ID
  load: () => Promise<void>;                  // Load conversations from server
  create: (title?, metadata?) => Promise<ConversationDoc>;  // Create new conversation
  setActive: (id: Id) => void;                // Switch conversation
  archive: (id: Id) => Promise<void>;         // Archive conversation
}
```

**Example:**

```tsx
function ConversationSidebar() {
  const { conversations, activeId, load, create, setActive } = useConversationList();

  onMount(() => load());  // Load on mount

  return (
    <div>
      <button onClick={() => create('New Chat')}>+ New</button>
      <For each={conversations()}>
        {conv => (
          <button
            onClick={() => setActive(conv.id)}
            class={activeId() === conv.id ? 'active' : ''}
          >
            {conv.title}
          </button>
        )}
      </For>
    </div>
  );
}
```

### useConversation(conversationId?)

Hook for a specific conversation's messages and actions.

```typescript
interface UseConversationReturn {
  messages: () => MessageDoc[];               // Reactive message list
  isStreaming: () => boolean;                 // Is any message streaming?
  load: () => Promise<void>;                  // Load messages from server
  send: (text: string, opts?) => Promise<void>;  // Send message (streams via /agent/run)
  cancel: (messageId: Id) => Promise<void>;   // Cancel streaming message
}
```

**Example:**

```tsx
function MessageView() {
  const { messages, isStreaming, load, send, cancel } = useConversation();

  onMount(() => load());  // Load messages on mount

  return (
    <div>
      <For each={messages()}>
        {msg => (
          <div>
            <MessageBubble message={msg} />
            {msg.status === 'streaming' && (
              <button onClick={() => cancel(msg.id)}>Cancel</button>
            )}
          </div>
        )}
      </For>
      {isStreaming() && <TypingIndicator />}
      <input onSubmit={e => send(e.target.value)} />
    </div>
  );
}
```

### useMessages(conversationId?)

Get reactive messages array for a conversation.

```typescript
const messages: () => MessageDoc[] = useMessages(conversationId);
```

**Example:**

```tsx
function MessageList(props: { conversationId: string }) {
  const messages = useMessages(props.conversationId);

  return (
    <For each={messages()}>
      {msg => <div>{msg.content}</div>}
    </For>
  );
}
```

### useStreamingText(messageId)

Get current streaming text for a message (if streaming).

```typescript
const streamingText: () => string = useStreamingText(messageId);
```

**Example:**

```tsx
function MessageBubble(props: { message: MessageDoc }) {
  const streamingText = useStreamingText(props.message.id);

  return (
    <div>
      {props.message.status === 'streaming' ? (
        <p>{streamingText()}</p>
      ) : (
        <p>{props.message.content}</p>
      )}
    </div>
  );
}
```

## Message Structure

Messages follow the official AG-UI schema with `content` for text and `toolCalls` for tool interactions:

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content: string;                    // Text content
  toolCalls?: ToolCall[];            // Tool invocations (assistant messages)

  // Custom fields for conversation management
  conversationId?: string;
  status?: 'streaming' | 'completed' | 'errored' | 'canceled';
  usage?: { prompt?: number; completion?: number; total?: number };
  createdAt?: string;
  metadata?: Record<string, unknown>;
  attachments?: string[];            // Attachment IDs
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;               // JSON string
  };
}
```

**Rendering Messages:**

```tsx
<For each={messages()}>
  {msg => (
    <div class={`message-${msg.role}`}>
      {/* Text content */}
      {msg.content && <p class="content">{msg.content}</p>}

      {/* Tool calls */}
      {msg.toolCalls && (
        <For each={msg.toolCalls}>
          {tc => {
            const args = JSON.parse(tc.function.arguments);
            return (
              <div class="tool-call">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">{tc.function.name}</span>
                <pre class="tool-args">{JSON.stringify(args, null, 2)}</pre>
              </div>
            );
          }}
        </For>
      )}
    </div>
  )}
</For>
```

## Advanced Usage

### Custom Transport (Bring Your Own Client)

```tsx
import type { AgUiClient } from '@livefire2015/solid-ag-chat';

class MyCustomClient implements AgUiClient {
  on(type, handler) { /* ... */ }
  off(type, handler) { /* ... */ }
  async createConversation(title?, metadata?) { /* ... */ }
  async sendMessage(convId, text, opts?) { /* ... */ }
  // ... implement other methods
  close() { /* ... */ }
}

<ChatProvider client={new MyCustomClient()}>
  <App />
</ChatProvider>
```

### File Upload Handling

```tsx
<ChatProvider
  client={client}
  upload={async (files) => {
    // 1. Upload files to your server
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    // 2. Return attachment metadata
    const attachments = await res.json();
    return attachments.map(att => ({
      id: att.id,
      name: att.filename,
      mime: att.contentType,
      size: att.size,
      url: att.downloadUrl,
      state: 'available' as const,
    }));
  }}
>
  <App />
</ChatProvider>
```

### Testing with MockAgClient

```tsx
import { MockAgClient, ChatProvider } from '@livefire2015/solid-ag-chat';

function DevApp() {
  const mockClient = new MockAgClient({
    tokenDelayMs: 30,  // Simulate streaming
    replyGenerator: (userText) => {
      return `Mock: ${userText}`.match(/.{1,5}/g) || [];
    }
  });

  return (
    <ChatProvider client={mockClient}>
      <App />
    </ChatProvider>
  );
}
```

## Backend Integration

Your server must implement the official AG-UI protocol. Example with PydanticAI:

```python
from fastapi import FastAPI
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.openai import OpenAIModel
from ag_ui.server import stream_run_events

app = FastAPI()
agent = Agent(OpenAIModel('gpt-4'))

# Conversation CRUD (custom endpoints)
@app.get("/conversations")
async def list_conversations():
    return [{"id": "c1", "title": "Chat 1", "createdAt": "...", ...}]

@app.post("/conversations")
async def create_conversation(payload: dict):
    conv = create_new_conversation(payload.get('title'))
    return conv

@app.get("/conversations/{id}/messages")
async def get_messages(id: str):
    return [{"id": "m1", "conversationId": id, "role": "user", "content": "Hello"}]

# Official AG-UI agent execution endpoint
@app.post("/agent/run")
async def run_agent(input: RunAgentInput):
    """
    Official AG-UI endpoint for stateless agent execution.
    Client sends full conversation history with each request.
    """
    # Convert AG-UI messages to PydanticAI format
    message_history = [
        ModelMessage(role=msg['role'], content=msg['content'])
        for msg in input.messages
    ]

    # Run agent and stream AG-UI events
    result = await agent.run(
        user_prompt=input.messages[-1]['content'],
        message_history=message_history[:-1]
    )

    # Stream official AG-UI events (TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, etc.)
    return StreamingResponse(
        stream_run_events(result),
        media_type='text/event-stream'
    )
```

## Official AG-UI Events

The SDK client emits these official AG-UI events during streaming:

### Message Events
| Event | Description |
|-------|-------------|
| `TEXT_MESSAGE_START` | Text message streaming started |
| `TEXT_MESSAGE_CONTENT` | Text delta (incremental content) |
| `TEXT_MESSAGE_END` | Text message completed |

### Tool Events
| Event | Description |
|-------|-------------|
| `TOOL_CALL_START` | Tool call started |
| `TOOL_CALL_ARGS` | Tool arguments delta |
| `TOOL_CALL_END` | Tool call completed |
| `TOOL_CALL_RESULT` | Tool result available |

### State Events
| Event | Description |
|-------|-------------|
| `STATE_SNAPSHOT` | Full state snapshot |
| `STATE_DELTA` | JSON Patch state delta |
| `MESSAGES_SNAPSHOT` | Messages snapshot |

### Custom Conversation Events
| Event | Description |
|-------|-------------|
| `conversation.created` | New conversation created |
| `conversation.updated` | Conversation changed |
| `conversation.archived` | Conversation archived |
| `message.created` | User message created |
| `message.errored` | Message failed |
| `message.canceled` | Message canceled |

## Migration from v0.x

If you're upgrading from the old `parts[]` system:

**Before (v0.x):**
```tsx
<For each={msg.parts}>
  {part => (
    <>
      {part.kind === 'text' && <p>{part.text}</p>}
      {part.kind === 'tool_call' && <div>{part.name}</div>}
    </>
  )}
</For>
```

**After (v1.0):**
```tsx
{msg.content && <p>{msg.content}</p>}
{msg.toolCalls && (
  <For each={msg.toolCalls}>
    {tc => <div>{tc.function.name}</div>}
  </For>
)}
```

**Client Migration:**
```tsx
// Before: SseAgClient with REST + SSE
const client = new SseAgClient({
  baseUrl: 'http://localhost:8000',
  paths: { conversations: '/conversations', messages: '/conversations/:id/messages' }
});

// After: Official SDK client
const client = createSdkAgent({
  baseUrl: 'http://localhost:8000',
  agentEndpoint: '/agent/run',              // Stateless agent execution
  conversationsEndpoint: '/conversations'    // Conversation management
});
```

## License

MIT

## Links

- [GitHub](https://github.com/livefire2015/solid-ag-chat)
- [npm](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
- [AG-UI Protocol](https://github.com/pydantic/agent-ui-spec)
- [PydanticAI](https://ai.pydantic.dev)
