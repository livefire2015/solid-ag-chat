# Project Structure

Overview of the solid-ag-chat library architecture and codebase organization.

## Directory Structure

```
solid-ag-chat/
├── v2/                          # Latest: v2.0.0 - Bidirectional tool execution
│   ├── src/
│   │   ├── index.ts             # Main exports
│   │   ├── types.ts             # Type definitions (AG-UI protocol + extensions)
│   │   ├── tool-executor.ts     # V2: Tool execution engine
│   │   ├── primitives/          # SolidJS hooks & components
│   │   │   ├── ChatProvider.tsx      # Context provider for AG-UI client
│   │   │   ├── useChat.ts            # Main hook
│   │   │   ├── useConversation.ts    # Single conversation management
│   │   │   ├── useConversationList.ts # Multi-conversation list
│   │   │   ├── useMessages.ts        # Message retrieval
│   │   │   ├── useStreamingText.ts   # Streaming text accumulation
│   │   │   ├── useToolCalls.ts       # V2: Tool call tracking
│   │   │   ├── useToolExecution.ts   # V2: Tool execution state
│   │   │   └── usePendingTools.ts    # V2: Pending tools queue
│   │   ├── store/               # State management (low-level)
│   │   │   ├── state.ts              # ChatState definition
│   │   │   └── createAgUiStore.ts    # Solid store creation & event handling
│   │   ├── transport/           # Client implementations
│   │   │   ├── sdk-agent.ts          # Official AG-UI SDK wrapper
│   │   │   └── sse.ts                # LEGACY: Custom SSE client
│   │   └── testing/             # Testing utilities
│   │       ├── mockClient.ts         # Mock AG-UI client for testing
│   │       └── scenarios.ts          # Test scenarios
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── v1/                          # v1.0.7 - Official AG-UI protocol support
├── v0/                          # DEPRECATED - Legacy version
├── CLAUDE.md                    # AI assistant instructions
├── LOCAL_DEVELOPMENT.md         # Local development guide
├── LOCAL_DEV_QUICKSTART.md      # Quick start for local dev
├── PUBLISHING.md                # NPM publishing guide
├── PROJECT_STRUCTURE.md         # This file
└── .gitignore
```

## Core Components

### Primitives (Hooks)

The library provides SolidJS hooks for building chat interfaces:

| Hook | Purpose |
|------|---------|
| `useChat` | Main hook combining conversation and message management |
| `useConversation` | Single conversation state and actions |
| `useConversationList` | Multi-conversation list management |
| `useMessages` | Message retrieval for a conversation |
| `useStreamingText` | Real-time streaming text accumulation |
| `useToolCalls` | Tool call tracking (V2) |
| `useToolExecution` | Tool execution state (V2) |
| `usePendingTools` | Pending tools queue (V2) |

### Transport Layer

Two client implementations:

1. **SdkAgClient** (`sdk-agent.ts`) - Official AG-UI SDK wrapper (recommended)
2. **SseAgClient** (`sse.ts`) - Legacy custom SSE client

### State Management

The store follows SolidJS reactive patterns:

```typescript
interface ChatState {
  revision: string;                    // Server revision tracking
  conversations: Record<Id, ConversationDoc>;
  messages: Record<Id, Message>;
  attachments: Record<Id, AttachmentDoc>;
  messagesByConversation: Record<Id, Id[]>;
  streaming: Record<Id, {text: string}>;
  toolCallsInProgress: Record<Id, ToolExecution>;
  activeConversationId?: Id;
}
```

## Integration Approaches

### 1. Provider Pattern (Recommended)

Use `ChatProvider` with hooks for full functionality:

```tsx
import { ChatProvider, useConversation, useMessages } from '@livefire2015/solid-ag-chat';
import { createSdkAgent } from '@livefire2015/solid-ag-chat';

const client = createSdkAgent({ baseUrl: 'http://localhost:8000' });

const App = () => (
  <ChatProvider client={client}>
    <ChatInterface />
  </ChatProvider>
);
```

### 2. Direct Store Access

For full control, use the store directly:

```tsx
import { createAgUiStore } from '@livefire2015/solid-ag-chat';

const store = createAgUiStore(client);
// Access store.state and store.actions directly
```

### 3. With Tool Execution (V2)

Register tools for bidirectional execution:

```tsx
const tools = [
  {
    name: 'get_weather',
    description: 'Get weather for a location',
    parameters: { /* JSON Schema */ },
    handler: async (args) => {
      return { temperature: 72, conditions: 'sunny' };
    }
  }
];

<ChatProvider client={client} tools={tools}>
  <ChatInterface />
</ChatProvider>
```

## Backend Requirements

The library expects a backend implementing the AG-UI protocol:

### Request Format

```typescript
POST /agent/run
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "context": { /* optional */ },
  "tools": [ /* tool definitions */ ]
}
```

### Response Format

Server-Sent Events stream with AG-UI events:

```
event: TEXT_MESSAGE_START
data: {"messageId": "msg_1", "role": "assistant"}

event: TEXT_MESSAGE_CONTENT
data: {"messageId": "msg_1", "delta": "Hello"}

event: TEXT_MESSAGE_END
data: {"messageId": "msg_1"}
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@ag-ui/core` | Official AG-UI protocol types |
| `@ag-ui/client` | Official HTTP agent (SDK) |
| `rxjs` | Reactive streams/observables |
| `fast-json-patch` | JSON Patch for state deltas |
| `solid-js` (peer) | Reactive UI framework |

## Build Configuration

The library builds with Vite in library mode:

- **ES Module**: `dist/index.js`
- **CommonJS**: `dist/index.cjs`
- **TypeScript**: `dist/index.d.ts`

External dependencies (not bundled): solid-js, solid-js/web, fast-json-patch, @ag-ui/core, @ag-ui/client, rxjs

## Version Evolution

| Version | Status | Key Features |
|---------|--------|--------------|
| v0 | Deprecated | Full component library with built-in UI |
| v1 | Previous | Official AG-UI protocol, hooks pattern |
| v2 | Current | Bidirectional tool execution, enhanced state tracking |

## Development Commands

```bash
cd v2

# Build for distribution
npm run build

# Watch mode for development
npm run dev

# Build JS and declarations
npm run build:js
```

## Exported APIs

### Transport Layer
```typescript
export { SdkAgClient, createSdkAgent } from './transport/sdk-agent';
export { SseAgClient } from './transport/sse';
```

### Primitives
```typescript
export { ChatProvider, useChatContext } from './primitives/ChatProvider';
export { useChat } from './primitives/useChat';
export { useConversation } from './primitives/useConversation';
export { useConversationList } from './primitives/useConversationList';
export { useMessages } from './primitives/useMessages';
export { useStreamingText } from './primitives/useStreamingText';
export { useToolCalls } from './primitives/useToolCalls';
export { useToolExecution } from './primitives/useToolExecution';
export { usePendingTools } from './primitives/usePendingTools';
```

### Utilities
```typescript
export { createAgUiStore } from './store/createAgUiStore';
export { ToolExecutor } from './tool-executor';
export { MockAgClient } from './testing/mockClient';
export { runBasicScenario } from './testing/scenarios';
```

## Testing

Testing utilities are provided for unit testing:

```typescript
import { MockAgClient, runBasicScenario } from '@livefire2015/solid-ag-chat';

const mockClient = new MockAgClient();
await runBasicScenario(mockClient);
```

## Next Steps

- See [CLAUDE.md](./CLAUDE.md) for AI assistant context
- See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for development setup
- See [PUBLISHING.md](./PUBLISHING.md) for npm publishing
- See `v2/README.md` for detailed usage documentation
