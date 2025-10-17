# @livefire2015/solid-ag-chat v1

**SolidJS library** for building chat UIs with official **AG-UI protocol** support.

[![npm version](https://badge.fury.io/js/@livefire2015%2Fsolid-ag-chat.svg)](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What This Library Provides

This is a **library** - not a ready-to-use chat UI. It provides:
- ✅ **SolidJS Primitives** - Provider, hooks for building custom chat UIs
- ✅ **AG-UI Protocol Client** - SSE + REST transport implementation
- ✅ **Reactive State Management** - Server-authoritative state mirrored locally
- ✅ **Type Safety** - Full TypeScript types for AG-UI protocol
- ✅ **Mock Client** - Testing infrastructure included

**You build the UI** - This library handles the protocol, state, and reactivity.

## AG-UI Protocol Overview

AG-UI is a **Server-Sent Events (SSE) + REST** protocol for AI chat interfaces:

```
┌─────────────┐         SSE Events          ┌─────────────┐
│   Browser   │◄───────────────────────────│   Server    │
│   Client    │     REST Intents           │  (Python)   │
│  (SolidJS)  │───────────────────────────►│ (PydanticAI)│
└─────────────┘                             └─────────────┘
```

**Key Features:**
- 🔄 **Server-Authoritative**: State lives on server, client mirrors it
- 🆔 **sessionId-based**: No localStorage, state is per-session
- 🖼️ **Multimodal Parts**: Text, images, audio, files, tool calls
- 🔧 **JSON Patch**: Delta updates using RFC 6902 operations

## Installation

```bash
npm install @livefire2015/solid-ag-chat
```

Peer dependency: `solid-js@^1.8.0`

## Quick Start

### 1. Wrap Your App with ChatProvider

```tsx
import { ChatProvider, SseAgClient } from '@livefire2015/solid-ag-chat';

function App() {
  // Create AG-UI client
  const client = new SseAgClient({
    baseUrl: 'http://localhost:8000',
    paths: {
      events: '/events',
      messageSend: '/message/send'
    }
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
import { useChat, useConversation } from '@livefire2015/solid-ag-chat';
import { For } from 'solid-js';

function YourChatUI() {
  const {
    conversations,
    activeId,
    setActive,
    sendUserMessage,
    isConnected
  } = useChat();

  const { messages, isStreaming } = useConversation();

  return (
    <div class="flex h-screen">
      {/* Conversation List */}
      <aside class="w-64 border-r">
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
                <For each={msg.parts}>
                  {part => (
                    <>
                      {part.kind === 'text' && <p>{part.text}</p>}
                      {part.kind === 'image' && <img src={part.url} alt={part.alt} />}
                    </>
                  )}
                </For>
              </div>
            )}
          </For>
          {isStreaming() && <div class="typing-indicator">...</div>}
        </div>

        {/* Input */}
        <form onSubmit={e => {
          e.preventDefault();
          const input = e.target.elements.message;
          sendUserMessage(input.value);
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

## API Reference

### ChatProvider

Provides AG-UI client and reactive state to all children.

```typescript
interface ChatProviderProps {
  client: AgUiClient;              // Required: AG-UI client instance
  upload?: (files: File[]) => Promise<AttachmentDoc[]>;  // Optional: file upload handler
  sessionId?: string;              // Optional: session identifier
  initialConversationId?: string;  // Optional: initial conversation to load
  children: JSX.Element;
}
```

**Example:**

```tsx
<ChatProvider
  client={new SseAgClient({ baseUrl: 'http://localhost:8000' })}
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

### useChat()

Main hook for conversations and global actions.

```typescript
interface UseChatReturn {
  conversations: () => ConversationDoc[];     // Reactive conversation list
  activeId: () => Id | undefined;             // Current conversation ID
  setActive: (id: Id) => void;                // Switch conversation
  sendUserMessage: (text: string, opts?) => Promise<void>;  // Send message
  attachFiles: (files: File[]) => Promise<void>;            // Upload files
  abortGeneration: (messageId?: Id) => Promise<void>;       // Cancel streaming
  isConnected: () => boolean;                               // Connection status
}
```

**Example:**

```tsx
function ConversationSidebar() {
  const { conversations, activeId, setActive } = useChat();

  return (
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
  );
}
```

### useConversation(conversationId?)

Hook for a specific conversation's messages and actions.

```typescript
interface UseConversationReturn {
  messages: () => MessageDoc[];               // Reactive message list
  isStreaming: () => boolean;                 // Is any message streaming?
  send: (text: string, opts?) => Promise<void>;  // Send message in this conversation
}
```

**Example:**

```tsx
function MessageView() {
  const { messages, isStreaming, send } = useConversation();

  return (
    <div>
      <For each={messages()}>
        {msg => <MessageBubble message={msg} />}
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
      {msg => <div>{msg.parts[0].text}</div>}
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
        <For each={props.message.parts}>
          {part => <>{part.kind === 'text' && part.text}</>}
        </For>
      )}
    </div>
  );
}
```

## Multimodal Parts

Messages use structured parts instead of plain strings:

```typescript
// Text
const textPart: Part = { kind: 'text', text: 'Hello!' };

// Image
const imagePart: Part = {
  kind: 'image',
  url: 'https://example.com/img.png',
  mime: 'image/png',
  alt: 'Description'
};

// Tool Call
const toolCallPart: Part = {
  kind: 'tool_call',
  id: 'tc_123',
  name: 'search',
  args: { query: 'weather in NYC' }
};

// Tool Result
const toolResultPart: Part = {
  kind: 'tool_result',
  id: 'tc_123',
  name: 'search',
  result: { temperature: 72, conditions: 'sunny' }
};
```

**Rendering Parts:**

```tsx
<For each={message.parts}>
  {part => (
    <>
      {part.kind === 'text' && <p>{part.text}</p>}
      {part.kind === 'image' && (
        <img src={part.url} alt={part.alt} class="rounded" />
      )}
      {part.kind === 'tool_call' && (
        <div class="tool-call">
          🔧 {part.name}({JSON.stringify(part.args)})
        </div>
      )}
      {part.kind === 'tool_result' && (
        <div class="tool-result">
          ✅ {JSON.stringify(part.result)}
        </div>
      )}
    </>
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
  async send(type, payload) { /* ... */ }
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
    autoReady: true,
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

Your server must implement AG-UI protocol. Example with FastAPI:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()
sessions = {}  # In-memory session state

@app.get("/events")
async def events(session_id: str):
    async def generate():
        # Send initial snapshot
        snap = sessions.get(session_id, create_empty_state(session_id))
        yield f"event: state.snapshot\ndata: {json.dumps(snap)}\n\n"

        # Keep connection alive
        while True:
            await asyncio.sleep(0.1)

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/message/send")
async def send_message(payload: dict, session_id: str):
    # Echo user message
    emit(session_id, 'message.created', {'message': user_msg})

    # Stream agent response
    async for token in agent.stream(payload['text']):
        emit(session_id, 'message.delta', {
            'messageId': asst_id,
            'textDelta': token
        })

    emit(session_id, 'message.completed', {'messageId': asst_id})
```

## Event Types

### Server → Client (SSE)

| Event | Description |
|-------|-------------|
| `client.ready` | Connection established |
| `state.snapshot` | Full state sync |
| `conversation.created` | New conversation |
| `conversation.updated` | Conversation changed |
| `message.created` | New message |
| `message.delta` | Streaming text update |
| `message.completed` | Message finished |
| `message.tool_call` | Tool invocation |
| `message.tool_result` | Tool result |

### Client → Server (REST)

| Intent | Description |
|--------|-------------|
| `conversation.create` | Create conversation |
| `conversation.select` | Switch conversation |
| `message.send` | Send user message |
| `message.abort` | Cancel streaming |
| `attachment.register` | Register uploaded file |

## License

MIT

## Links

- [GitHub](https://github.com/livefire2015/solid-ag-chat)
- [npm](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
- [AG-UI Protocol](https://docs.ag-ui.com)
- [PydanticAI](https://ai.pydantic.dev)
