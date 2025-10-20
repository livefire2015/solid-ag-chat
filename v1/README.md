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

AG-UI is a **REST + Per-Message SSE** protocol for AI chat interfaces:

```
┌─────────────┐    Per-Message SSE     ┌─────────────┐
│   Browser   │◄───────────────────────│   Server    │
│   Client    │     REST API           │  (Python)   │
│  (SolidJS)  │───────────────────────►│ (PydanticAI)│
└─────────────┘                        └─────────────┘
```

**Key Features:**
- 📨 **Per-Message Streaming**: Each message creates a new SSE stream
- 🏗️ **RESTful Design**: Standard CRUD operations for conversations/messages
- 🖼️ **Multimodal Parts**: Text, images, audio, files, tool calls
- ⚡ **Auto-Create Support**: Send messages without creating conversation first

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
  // Create AG-UI client with REST endpoints
  const client = new SseAgClient({
    baseUrl: 'http://localhost:8000',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'  // Optional auth
    },
    paths: {
      conversations: '/conversations',                    // GET/POST conversations
      messages: '/conversations/:id/messages',           // GET/POST messages
      autoCreate: '/messages'                            // POST message (auto-creates conversation)
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
          send(input.value);  // Per-message SSE streaming
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

### useChat()

Legacy hook that combines conversation management and messaging.

```typescript
interface UseChatReturn {
  conversations: () => ConversationDoc[];     // Reactive conversation list
  activeId: () => Id | undefined;             // Current conversation ID
  setActive: (id: Id) => void;                // Switch conversation
  loadConversations: () => Promise<void>;     // Load conversations
  createConversation: (title?) => Promise<ConversationDoc>;  // Create conversation
  sendMessage: (convId, text, opts?) => Promise<void>;       // Send message
  cancelMessage: (convId, msgId) => Promise<void>;           // Cancel streaming
  isConnected: () => boolean;                                // Connection status
}
```

### useConversation(conversationId?)

Hook for a specific conversation's messages and actions.

```typescript
interface UseConversationReturn {
  messages: () => MessageDoc[];               // Reactive message list
  isStreaming: () => boolean;                 // Is any message streaming?
  load: () => Promise<void>;                  // Load messages from server
  send: (text: string, opts?) => Promise<void>;  // Send message (creates per-message SSE stream)
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

Your server must implement REST + per-message SSE. Example with FastAPI:

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

# Conversation CRUD
@app.get("/conversations")
async def list_conversations():
    return [{"id": "c1", "title": "Chat 1", "createdAt": "...", ...}]

@app.post("/conversations")
async def create_conversation(payload: dict):
    conv = create_new_conversation(payload.get('title'))
    return conv

@app.get("/conversations/{id}/messages")
async def get_messages(id: str):
    return [{"id": "m1", "conversationId": id, "role": "user", ...}]

# Per-message SSE streaming
@app.post("/conversations/{id}/messages")
async def send_message(id: str, payload: dict):
    async def generate():
        # Create user message
        user_msg = create_user_message(id, payload['text'])
        yield f"event: message.created\ndata: {json.dumps({'message': user_msg})}\n\n"

        # Create assistant message
        asst_msg = create_assistant_message(id)
        yield f"event: message.created\ndata: {json.dumps({'message': asst_msg})}\n\n"

        # Stream response tokens
        async for token in agent.stream(payload['text']):
            yield f"event: message.delta\ndata: {json.dumps({'messageId': asst_msg['id'], 'textDelta': token})}\n\n"

        # Complete message
        yield f"event: message.completed\ndata: {json.dumps({'messageId': asst_msg['id']})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

# Auto-create endpoint (no conversation ID required)
@app.post("/messages")
async def send_message_auto_create(payload: dict):
    # Same as above, but creates conversation first
    conv = create_new_conversation()
    # ... then stream messages
```

## API Endpoints & Events

### REST Endpoints (Client → Server)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversations` | List conversations |
| `POST` | `/conversations` | Create conversation |
| `GET` | `/conversations/:id` | Get conversation |
| `PATCH` | `/conversations/:id` | Update conversation |
| `DELETE` | `/conversations/:id` | Archive conversation |
| `GET` | `/conversations/:id/messages` | Get messages |
| `POST` | `/conversations/:id/messages` | Send message (returns SSE stream) |
| `POST` | `/messages` | Send message + auto-create conversation |
| `DELETE` | `/conversations/:id/messages/:msgId` | Cancel message |

### SSE Events (Server → Client)

Sent during per-message streaming:

| Event | Description |
|-------|-------------|
| `conversation.created` | New conversation created |
| `conversation.updated` | Conversation changed |
| `conversation.archived` | Conversation archived |
| `message.created` | New message |
| `message.delta` | Streaming text update |
| `message.completed` | Message finished |
| `message.errored` | Message failed |
| `message.canceled` | Message canceled |
| `message.tool_call` | Tool invocation |
| `message.tool_result` | Tool result |
| `attachment.available` | File ready |
| `attachment.failed` | Upload failed |

## License

MIT

## Links

- [GitHub](https://github.com/livefire2015/solid-ag-chat)
- [npm](https://www.npmjs.com/package/@livefire2015/solid-ag-chat)
- [AG-UI Protocol](https://docs.ag-ui.com)
- [PydanticAI](https://ai.pydantic.dev)
